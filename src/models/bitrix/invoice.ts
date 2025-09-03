import { CrmData } from './crm.ts';

export type InvoiceData = CrmData & {
  paymentLeft?: number;
  dealOrders?: number;
};

export type Invoices = { [key: string]: Array<InvoiceData> };
