import { CrmData } from './crm.ts';
import { OrderData } from './order.ts';

export type InvoiceData = CrmData & {
  paymentLeft?: number;
  order?: OrderData;
};

export type Invoices = { [key: string]: Array<InvoiceData> };
