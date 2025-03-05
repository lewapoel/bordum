import { createContext } from "react";
import { ItemWarehouses } from "../api/comarch/item.ts";

export type Order = {
  dealId?: number;
  leadId?: number;
};

export type OrderItem = {
  id: number;
  productName: string;
  quantity: number;
  unit: string;
  unitCode?: string;
  unitPrice: number;
};

export type OrderItems = Array<OrderItem>;

export enum OrderView {
  Summary,
  Items,
  Item,
}

export type OrderData = {
  setCurrentView: (view: OrderView) => void;
  currentItem?: ItemWarehouses;
  setCurrentItem: (item: ItemWarehouses) => void;
  saveItem: (item: OrderItem) => void;
  removeItem: () => void;
  selectedItem: number;
  setSelectedItem: (item: number) => void;
  saveOrder: () => Promise<void>;
};
export const OrderContext = createContext<OrderData | null>(null);
