import { createContext } from 'react';
import { DocumentType } from '../api/comarch/document.ts';
import { OrderData, OrderItem } from './bitrix/order.ts';
import { CreditCustomer } from '../api/comarch-sql/customer.ts';

export enum OrderView {
  Summary,
  Items,
}

// Used for showing different UI variations depending on the action that is taken
export enum OrderType {
  Create,
  CreateDeal,
  Edit,
}

export type OrderStore = {
  maxDiscount?: number;
  currentView: OrderView;
  setCurrentView: (view: OrderView) => void;
  saveItem: (item: OrderItem) => 'add' | 'edit';
  editItemQuantity: (index: number, quantity: number) => number | null;
  removeItem: () => void;
  selectedItem: number;
  setSelectedItem: (item: number) => void;
  order?: OrderData;
  selectedPrice?: string;
  saveOrder: () => Promise<void>;
  pendingOrder: boolean;
  createOrder: () => Promise<void>;
  addDocument: {
    mutation: (
      documentType: DocumentType,
      exportDocument?: boolean,
    ) => Promise<void>;
    pending: boolean;
  };
  invoices: {
    client?: CreditCustomer | null;
    limitLeft: number;
    allowWarning: boolean;
  };
  allowAddingProduct: boolean;
};
export const OrderContext = createContext<OrderStore | null>(null);
