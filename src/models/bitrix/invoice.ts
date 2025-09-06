import { CrmData } from './crm.ts';

export type InvoiceData = CrmData & {
  clientName: string;
  paymentLeft?: number;
  dealOrders?: number;
};

export type Invoices = { [key: string]: Array<InvoiceData> };
