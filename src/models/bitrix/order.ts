import { CrmData } from './crm.ts';

export type OrderItem = {
  id?: number;
  warehouseCode: string;
  groupId: string;
  itemId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitCode?: string;
  unitPrice: number;
};

export type OrderItems = Array<OrderItem>;

export type PackagingDataItem = {
  itemId: number;
  quality: number;
  packerId: number;
  date: string;
  comment: string;
};

export type PackagingData = { [key: string]: PackagingDataItem };

export type VerificationDataItem = {
  itemId: number;
  actualStock: number;
  qualityGoods: number;
  comment: string;
};

export type VerificationData = { [key: string]: VerificationDataItem };

// Meant for internal use only, use `OrderItem` and it's props instead
export type OrderAdditionalData = {
  warehouseCodes?: Array<string>;
  groupIds?: Array<string>;
  itemIds?: Array<string>;
};

export type OrderData = CrmData & {
  dealId?: number;
  leadId?: number;
  additionalData?: OrderAdditionalData;
  packagingData?: PackagingData;
  verificationData?: VerificationData;
  items: OrderItems;

  // Offer details section
  depositRequired?: string;
  paymentVariant?: string;
  depositDueDate?: string;
  paymentType?: string;
  deliveryType?: string;
  installationService?: string;
};
