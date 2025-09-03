import {
  getBitrix24,
  getCompanyCode,
  getContactCode,
} from '@/utils/bitrix24.ts';
import { InvoiceData, Invoices } from '@/models/bitrix/invoice.ts';
import {
  ENTITY_TYPES,
  INVOICE_PAYMENT_TYPES,
  INVOICE_STAGES,
} from '@/data/bitrix/const.ts';
import { getCompany } from './company.ts';
import { getContact } from './contact.ts';
import { getOrder } from './order.ts';
import { INVOICE_PAYMENT_TYPE_FIELD } from '@/data/bitrix/field.ts';

export type DueInvoicesFilter = {
  companyId?: number;
  contactId?: number;
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
          const orderId = item['parentId7'];
          const categoryId = +item['categoryId'];

          let company;
          let contact;

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
          } else if (contact) {
            code = getContactCode(contact);
          } else {
            continue;
          }

          let order;
          if (orderId) {
            order = await getOrder(orderId);
          }

          const invoice: InvoiceData = {
            id: item['id'],
            categoryId: categoryId,
            order: order ? order : undefined,
            companyId: companyId && companyId !== 0 ? companyId : undefined,
            contactId: contactId && contactId !== 0 ? contactId : undefined,
            paymentLeft: item['opportunity'] ?? undefined,
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
      [INVOICE_PAYMENT_TYPE_FIELD]: INVOICE_PAYMENT_TYPES.CREDIT_LIMIT,
    };

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
