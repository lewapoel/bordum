import { CrmData } from './crm.ts';
import { GroupsCodes } from '@/api/comarch-sql/product.ts';

export type OrderItem = {
  id?: number;
  code: string;
  groups: GroupsCodes;
  itemId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitCode?: string;
  unitPrice: number;
  taxRate?: number;
  discountRate?: number;
};

export type PackagingDataItem = {
  itemId: number;
  quality: number;
  packerId: number;
  date: string;
  comment: string;
  saved?: boolean;
};

export type PackagingData = { [key: string]: PackagingDataItem };

export type VerificationDataItem = {
  itemId: number;
  actualStock: string | number;
  qualityGoods: string | number;
  comment: string;
};

export type VerificationData = { [key: string]: VerificationDataItem };

// Meant for Bitrix API use only, use `OrderItem` and its props instead
export type OrderAdditionalData = {
  itemCodes?: Array<string>;
  itemGroups?: Array<GroupsCodes>;
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
  deliveryDate?: string;
  paymentDue?: string;
};
