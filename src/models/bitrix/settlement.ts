import { CrmData } from './crm.ts';
import { OrderData } from './order.ts';

export type SettlementData = CrmData & {
  opportunity: number;
  paymentLeft?: number;
  order?: OrderData;
};

export type Settlements = { [key: string]: Array<SettlementData> };
