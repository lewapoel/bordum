import { CrmData } from './crm.ts';
import { OrderItem } from './order.ts';

export type ReturnImage = {
  id: number;
  url: string;
};

export type ReturnDataItem = {
  item: OrderItem;
  releaseDocument: string;
  returnQuantity: number;
  date: string;
  reason: string;
  images: Array<ReturnImage>;
};

export type ReturnData = { [key: string]: ReturnDataItem };

export type DealData = CrmData & {
  returnData?: ReturnData;
};
