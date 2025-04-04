import { createContext } from 'react';
import { ItemWarehouses } from '../api/comarch/item.ts';
import { DocumentType } from '../api/comarch/document.ts';
import { OrderData, OrderItem } from './bitrix/order.ts';

export enum OrderView {
  Summary,
  Items,
  Item,
}

// Used for showing different UI variations depending on the action that is taken
export enum OrderType {
  Create,
  Edit,
}

export type OrderStore = {
  currentView: OrderView;
  setCurrentView: (view: OrderView) => void;
  currentItem?: ItemWarehouses;
  setCurrentItem: (item: ItemWarehouses) => void;
  saveItem: (item: OrderItem) => void;
  removeItem: () => void;
  selectedItem: number;
  setSelectedItem: (item: number) => void;
  order?: OrderData;
  saveOrder: () => Promise<void>;
  createOrder: () => Promise<void>;
  addDocument: {
    mutation: (
      documentType: DocumentType,
      ignoreDeleteError?: boolean,
    ) => Promise<void>;
    pending: boolean;
  };
};
export const OrderContext = createContext<OrderStore | null>(null);
