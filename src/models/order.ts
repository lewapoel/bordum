import { createContext } from 'react';
import { ItemWarehouses } from '../api/comarch/item.ts';

export type OrderItem = {
  id: number;
  warehouseCode: string;
  productName: string;
  quantity: number;
  unit: string;
  unitCode?: string;
  unitPrice: number;
};

export type OrderItems = Array<OrderItem>;

// Item ID -> Warehouse code
export type WarehouseCodes = { [key: number]: string };

export type PackagingDataItem = {
  itemId: number;
  quality: number;
  packerId: number;
  date: string;
  comment: string;
};

export type PackagingData = { [key: number]: PackagingDataItem };

export type OrderAdditionalData = {
  warehouseCodes?: WarehouseCodes;
};

export type OrderData = {
  dealId?: number;
  leadId?: number;
  additionalData?: OrderAdditionalData;
  packagingData?: PackagingData;
  items: OrderItems;
};

export enum OrderView {
  Summary,
  Items,
  Item,
}

export type OrderStore = {
  setCurrentView: (view: OrderView) => void;
  currentItem?: ItemWarehouses;
  setCurrentItem: (item: ItemWarehouses) => void;
  saveItem: (item: OrderItem) => void;
  removeItem: () => void;
  selectedItem: number;
  setSelectedItem: (item: number) => void;
  saveOrder: () => Promise<void>;
  addReleaseDocument: () => Promise<void>;
};
export const OrderContext = createContext<OrderStore | null>(null);
