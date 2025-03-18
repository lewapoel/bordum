import { createContext } from 'react';
import { ItemWarehouses } from '../api/comarch/item.ts';
import { DocumentType } from '../api/comarch/document.ts';
import { OrderItem } from './bitrix/order.ts';

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
  addDocument: {
    mutation: (
      documentType: DocumentType,
      ignoreDeleteError?: boolean,
    ) => Promise<void>;
    pending: boolean;
  };
};
export const OrderContext = createContext<OrderStore | null>(null);
