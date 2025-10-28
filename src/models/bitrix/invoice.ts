import { CrmData } from './crm.ts';
import { DealData } from '@/models/bitrix/deal.ts';

export type InvoiceData = CrmData & {
  dealId?: number;
  deal?: DealData;
  clientName?: string;
  clientType?: string;
  paymentType?: string;
  paymentLeft?: number;
  dealOrders?: number;
  orderAmount?: number;
  paymentVariant?: string;
  paymentStage?: string;
  paymentDue?: string;
};

export type Invoices = { [key: string]: Array<InvoiceData> };
