export type OrderItem = {
  id?: number;
  warehouseCode: string;
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

export type PackagingData = { [key: number]: PackagingDataItem };

export type OrderAdditionalData = {
  // Meant for internal use only, use `OrderItem.warehouseCode` instead
  warehouseCodes?: Array<string>;
};

export type OrderData = {
  dealId?: number;
  leadId?: number;
  buyerNip?: string;
  companyId?: number;
  contactId?: number;
  additionalData?: OrderAdditionalData;
  packagingData?: PackagingData;
  items: OrderItems;
};
