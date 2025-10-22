import {
  getBitrix24,
  getCompanyCode,
  getContactCode,
  getEnumValue,
} from '@/utils/bitrix24.ts';
import { InvoiceData, Invoices } from '@/models/bitrix/invoice.ts';
import {
  ENTITY_TYPES,
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

        const companyId = data['companyId'];
        const contactId = data['contactId'];
        const dealId = data['parentId2'];
        const categoryId = +data['categoryId'];

        let company;
        let contact;
        let clientName;

        if (companyId) {
          company = await getCompany(companyId);
        } else if (contactId) {
          contact = await getContact(contactId);
        }

        if (company) {
          clientName = company.title;
        } else if (contact) {
          clientName = `${contact.name} ${contact.lastName}`;
        }

        let dealOrders, deal;
        if (dealId) {
          dealOrders = await getDealOrders(dealId);
          deal = await getDeal(dealId);
        }

        const invoice: InvoiceData = {
          id: data['id'],
          categoryId: categoryId,
          dealOrders: dealOrders ? dealOrders : undefined,
          clientName: clientName,
          clientType: String(data[INVOICE_CLIENT_TYPE_FIELD]) ?? undefined,
          companyId: companyId && companyId !== 0 ? companyId : undefined,
          company: company ?? undefined,
          contactId: contactId && contactId !== 0 ? contactId : undefined,
          contact: contact ?? undefined,
          paymentLeft: data['opportunity'] ?? undefined,
          deal: deal ?? undefined,
          orderAmount: data[INVOICE_PROFORM_AMOUNT_FIELD]
            ? +data[INVOICE_PROFORM_AMOUNT_FIELD]
            : undefined,
          paymentVariant: getEnumValue(
            fields?.[INVOICE_PAYMENT_VARIANT_FIELD] as EnumFieldMeta,
            data[INVOICE_PAYMENT_VARIANT_FIELD] ?? undefined,
          ),
          paymentStage: getEnumValue(
            fields?.[INVOICE_PAYMENT_STAGE_FIELD] as EnumFieldMeta,
            data[INVOICE_PAYMENT_STAGE_FIELD] ?? undefined,
          ),
          paymentDue: data[INVOICE_PAYMENT_DUE_FIELD] ?? undefined,
        };

        resolve(invoice);
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
          const companyId = item['companyId'];
          const contactId = item['contactId'];
          const dealId = item['parentId2'];
          const categoryId = +item['categoryId'];

          let company;
          let contact;
          let clientName;

          if (companyId) {
            company = await getCompany(companyId);
          } else if (contactId) {
            contact = await getContact(contactId);
          }

          if (!company && !contact) {
            continue;
          }

          let code;
          if (company) {
            code = getCompanyCode(company);
            clientName = company.title;
          } else if (contact) {
            code = getContactCode(contact);
            clientName = `${contact.name} ${contact.lastName}`;
          } else {
            continue;
          }

          let dealOrders;
          if (dealId) {
            dealOrders = await getDealOrders(dealId);
          }

          const invoice: InvoiceData = {
            id: item['id'],
            categoryId: categoryId,
            dealOrders: dealOrders ? dealOrders : undefined,
            clientName: clientName,
            clientType: String(data[INVOICE_CLIENT_TYPE_FIELD]) ?? undefined,
            companyId: companyId && companyId !== 0 ? companyId : undefined,
            company: company ?? undefined,
            contactId: contactId && contactId !== 0 ? contactId : undefined,
            contact: contact ?? undefined,
            paymentLeft: item['opportunity'] ?? undefined,
            paymentDue: data[INVOICE_PAYMENT_DUE_FIELD] ?? undefined,
          };

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
        opportunity: paymentLeft,
        [INVOICE_PAYMENT_DUE_FIELD]: nextPaymentDue,
        [INVOICE_PAYMENT_STATUS_FIELD]: paymentStatus,
      },
    };

    bx24.callMethod('crm.item.update', updateBody, setInvoiceCallback);
  });
}
