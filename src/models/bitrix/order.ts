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
  taxRate?: number;
};

export type PackagingDataItem = {
  itemId: number;
  quality: number;
  packerId: number;
  date: string;
  comment: string;
  reservationCreated?: boolean;
};

export type PackagingData = { [key: string]: PackagingDataItem };

export type VerificationDataItem = {
  itemId: number;
  actualStock: string | number;
  qualityGoods: string | number;
  comment: string;
};

export type VerificationData = { [key: string]: VerificationDataItem };

// Meant for internal use only, use `OrderItem` and its props instead
export type OrderAdditionalData = {
  warehouseCodes?: Array<string>;
  groupIds?: Array<string>;
  itemIds?: Array<string>;
};

export type OrderDeliveryAddress = {
  postalCode?: string;
  city?: string;
  street?: string;
  houseNumber?: string;
};

export type OrderData = CrmData & {
  dealId?: number;
  leadId?: number;
  title?: string;
  additionalData?: OrderAdditionalData;
  packagingData?: PackagingData;
  verificationData?: VerificationData;
  deliveryAddress: OrderDeliveryAddress;
  items: Array<OrderItem>;
  paymentType?: string;
};
