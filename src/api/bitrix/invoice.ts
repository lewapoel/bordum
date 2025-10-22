import {
  getBitrix24,
  getCompanyCode,
  getContactCode,
  getEnumValue,
} from '@/utils/bitrix24.ts';
import { InvoiceData, Invoices } from '@/models/bitrix/invoice.ts';
import {
  ENTITY_TYPES,
  INVOICE_CLIENT_TYPES,
  INVOICE_PAYMENT_TYPES,
  INVOICE_STAGES,
} from '@/data/bitrix/const.ts';
import { getCompany } from './company.ts';
import { getContact } from './contact.ts';
import {
  INVOICE_CLIENT_TYPE_FIELD,
  INVOICE_PAYMENT_DUE_FIELD,
  INVOICE_PAYMENT_STAGE_FIELD,
  INVOICE_PAYMENT_STATUS_FIELD,
  INVOICE_PAYMENT_TYPE_FIELD,
  INVOICE_PAYMENT_VARIANT_FIELD,
  INVOICE_PROFORM_AMOUNT_FIELD,
} from '@/data/bitrix/field.ts';
import { getDeal, getDealOrders } from '@/api/bitrix/deal.ts';
import { EnumFieldMeta, FieldsMeta } from '@/models/bitrix/field.ts';

export async function getInvoiceFields(): Promise<FieldsMeta | null> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const getFieldsCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się pobrać pól faktury. Szczegóły w konsoli');
        reject();
      } else {
        const data = result.data()['fields'];
        resolve(data as FieldsMeta);
      }
    };

    bx24.callMethod(
      'crm.item.fields',
      { entityTypeId: ENTITY_TYPES.INVOICE },
      getFieldsCallback,
    );
  });
}

async function parseInvoice(
  data: any,
  fields?: FieldsMeta | null,
): Promise<InvoiceData> {
  const companyId = data['companyId'];
  const contactId = data['contactId'];

  let invoice: InvoiceData = {
    id: +data['id'],
    dealId: +data['parentId2'],
    categoryId: +data['categoryId'],
    clientType: data[INVOICE_CLIENT_TYPE_FIELD]
      ? String(data[INVOICE_CLIENT_TYPE_FIELD])
      : undefined,
    companyId: companyId ? +companyId : undefined,
    contactId: contactId ? +contactId : undefined,
    paymentLeft: data['opportunity'] ?? undefined,
    orderAmount: data[INVOICE_PROFORM_AMOUNT_FIELD]
      ? +data[INVOICE_PROFORM_AMOUNT_FIELD]
      : undefined,
    paymentDue: data[INVOICE_PAYMENT_DUE_FIELD] ?? undefined,
  };

  if (
    invoice.clientType === INVOICE_CLIENT_TYPES.COMPANY &&
    invoice.companyId
  ) {
    const company = await getCompany(invoice.companyId);
    invoice.company = company ?? undefined;
  } else if (
    invoice.clientType === INVOICE_CLIENT_TYPES.INDIVIDUAL &&
    invoice.contactId
  ) {
    const contact = await getContact(invoice.contactId);
    invoice.contact = contact ?? undefined;
  }

  if (invoice.company) {
    invoice.clientName = invoice.company.title;
  } else if (invoice.contact) {
    invoice.clientName = `${invoice.contact.name} ${invoice.contact.lastName}`;
  }

  if (invoice.dealId) {
    const dealOrders = await getDealOrders(invoice.dealId);
    const deal = await getDeal(invoice.dealId);

    invoice.dealOrders = dealOrders ?? undefined;
    invoice.deal = deal ?? undefined;
  }

  if (fields) {
    invoice = {
      ...invoice,
      paymentVariant: getEnumValue(
        fields[INVOICE_PAYMENT_VARIANT_FIELD] as EnumFieldMeta,
        data[INVOICE_PAYMENT_VARIANT_FIELD] ?? undefined,
      ),
      paymentStage: getEnumValue(
        fields[INVOICE_PAYMENT_STAGE_FIELD] as EnumFieldMeta,
        data[INVOICE_PAYMENT_STAGE_FIELD] ?? undefined,
      ),
    };
  }

  return invoice;
}

export async function getInvoice(
  placementId: number,
): Promise<InvoiceData | null> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  const fields = await getInvoiceFields();

  return new Promise((resolve, reject) => {
    const getInvoiceCallback = async (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się pobrać faktury. Szczegóły w konsoli');
        reject();
      } else {
        const data = result.data()['item'];

        if (!fields) {
          resolve(null);
        } else {
          resolve(await parseInvoice(data, fields));
        }
      }
    };

    bx24.callMethod(
      'crm.item.get',
      { entityTypeId: ENTITY_TYPES.INVOICE, id: placementId },
      getInvoiceCallback,
    );
  });
}

export type DueInvoicesFilter = {
  companyId?: number;
  contactId?: number;
  paymentType?: string;
};

export async function getDueInvoices(
  filter?: DueInvoicesFilter,
): Promise<Invoices | null> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const getInvoicesCallback = async (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się pobrać listy faktur. Szczegóły w konsoli');
        reject();
      } else {
        const data = result.data();
        const invoices: Invoices = {};

        for (const item of data['items']) {
          const invoice = await parseInvoice(item);

          if (!invoice.company && !invoice.contact) {
            continue;
          }

          let code;
          if (invoice.company) {
            code = getCompanyCode(invoice.company);
          } else if (invoice.contact) {
            code = getContactCode(invoice.contact);
          } else {
            continue;
          }

          if (!invoices[code]) {
            invoices[code] = [invoice];
          } else {
            invoices[code].push(invoice);
          }
        }

        resolve(invoices);
      }
    };

    const bitrixFilter: any = {
      '@stageId': [
        INVOICE_STAGES.AWAITING_PAYMENT,
        INVOICE_STAGES.OVERDUE,
        INVOICE_STAGES.DEBT_COLLECTION,
      ],
    };

    if (filter?.paymentType) {
      bitrixFilter[INVOICE_PAYMENT_TYPE_FIELD] = filter.paymentType;
    }

    if (filter?.companyId) {
      bitrixFilter['companyId'] = filter.companyId;
    }

    if (filter?.contactId) {
      bitrixFilter['companyId'] = 0;
      bitrixFilter['contactId'] = filter.contactId;
    }

    bx24.callMethod(
      'crm.item.list',
      {
        entityTypeId: ENTITY_TYPES.INVOICE,
        filter: bitrixFilter,
      },
      getInvoicesCallback,
    );
  });
}

export async function getClientDueCreditInvoices(filter: DueInvoicesFilter) {
  return getClientDueInvoices({
    ...filter,
    paymentType: INVOICE_PAYMENT_TYPES.CREDIT_LIMIT,
  });
}

export async function getClientDueInvoices(filter: DueInvoicesFilter) {
  const res = await getDueInvoices(filter);

  if (res) {
    const values = Object.values(res);

    if (values.length === 0) {
      return [];
    } else {
      return values[0];
    }
  }

  return undefined;
}

export async function updateInvoicePayment(
  placementId: number,
  paymentLeft: number,
  paymentStatus: string,
  nextPaymentDue: string,
) {
  const bx24 = getBitrix24();
  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const setInvoiceCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się zapisać faktury. Szczegóły w konsoli');
        reject();
      } else {
        alert('Faktura zapisana pomyślnie');
        resolve(true);
      }
    };

    const updateBody = {
      entityTypeId: ENTITY_TYPES.INVOICE,
      id: placementId,
      fields: {
        stageId: INVOICE_STAGES.PROCESSING,
        opportunity: paymentLeft,
        [INVOICE_PAYMENT_DUE_FIELD]: nextPaymentDue,
        [INVOICE_PAYMENT_STATUS_FIELD]: paymentStatus,
      },
    };

    bx24.callMethod('crm.item.update', updateBody, setInvoiceCallback);
  });
}
