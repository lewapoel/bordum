import { CrmData } from './crm.ts';
import { OrderItem } from './order.ts';

export type ReturnDataItem = {
  item: OrderItem;
  wantsReturn: boolean;
  date: string;
  comment: string;
};

export type ReturnData = { [key: string]: ReturnDataItem };

export type DealData = CrmData & {
  // Offering section
  depositRequired?: string;
  paymentVariant?: string;
  depositDueDate?: string;
  paymentType?: string;
  deliveryType?: string;
  installationService?: string;

  returnData?: ReturnData;
};
