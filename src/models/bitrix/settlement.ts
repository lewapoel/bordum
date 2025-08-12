import { CrmData } from './crm.ts';

export type SettlementData = CrmData & {
  opportunity: number;
  paymentLeft?: number;
};

export type Settlements = { [key: string]: Array<SettlementData> };
