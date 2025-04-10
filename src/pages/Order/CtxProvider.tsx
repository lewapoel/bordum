import { ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { OrderData, OrderItem } from '../../models/bitrix/order.ts';
import update from 'immutability-helper';
import {
  createOrder,
  getOrder,
  updateOrder,
} from '../../api/bitrix24/order.ts';
import { DocumentType, useAddDocument } from '../../api/comarch/document.ts';
import { OrderContext, OrderType, OrderView } from '../../models/order.ts';
import { ItemWarehouses } from '../../api/comarch/item.ts';
import { AuthContext } from '../../api/comarch/auth.ts';
import { getCurrentPlacementId } from '../../utils/bitrix24.ts';
import { getDeal } from '../../api/bitrix24/deal.ts';

interface CtxProviderProps {
  children: ReactNode;
  orderType: OrderType;
}

export default function CtxProvider({ children, orderType }: CtxProviderProps) {
  const { token } = useContext(AuthContext);
  const [selectedItem, setSelectedItem] = useState(0);
  const [currentView, setCurrentView] = useState<OrderView>(OrderView.Summary);
  const [currentItem, setCurrentItem] = useState<ItemWarehouses>();
  const [order, setOrder] = useState<OrderData>();
  const placementId = getCurrentPlacementId();
  const [firstLoad, setFirstLoad] = useState(false);

  useEffect(() => {
    switch (orderType) {
      case OrderType.Create:
        if (!placementId) {
          alert('Nie można pobrać ID aktualnego deala');
          return;
        }

        getDeal(placementId).then((res) => {
          if (res) {
            setOrder({
              items: [],
              contactId: res.contactId,
              companyId: res.companyId,
            });
            setFirstLoad(true);
          }
        });
        break;

      case OrderType.Edit:
        if (!placementId) {
          alert('Nie można pobrać ID aktualnej oferty');
          return;
        }

        getOrder(placementId).then((res) => {
          if (res) {
            setOrder(res);
            setFirstLoad(true);
          }
        });
        break;
    }
  }, [placementId, orderType]);

  const addDocumentMutation = useAddDocument(token);

  const saveItem = useCallback(
    (item: OrderItem) => {
      // Adding new item when `selectedItem` is out of range
      if (selectedItem === order?.items.length) {
        setOrder((prev) => update(prev, { items: { $push: [item] } }));
      } else {
        setOrder((prev) =>
          update(prev, { items: { [selectedItem]: { $set: item } } }),
        );
      }
    },
    [selectedItem, order],
  );

  const removeItem = useCallback(() => {
    if (order && selectedItem < order.items.length) {
      setOrder((prev) =>
        update(prev, { items: { $splice: [[selectedItem, 1]] } }),
      );
    }
  }, [selectedItem, order]);

  const saveOrder = useCallback(async () => {
    if (order) {
      void updateOrder(placementId, order.items, true);
    }
  }, [placementId, order]);

  const newOrder = useCallback(async () => {
    if (order) {
      createOrder(placementId, order.contactId, order.companyId).then(
        (orderId) => {
          if (orderId) {
            void updateOrder(orderId, order.items, true);
          } else {
            alert('Utworzona oferta nie ma identyfikatora');
          }
        },
      );
    }
  }, [placementId, order]);

  const addDocument = useCallback(
    async (documentType: DocumentType, ignoreDeleteError = false) => {
      if (order) {
        void addDocumentMutation.mutate({
          order: order,
          placementId,
          documentType,
          ignoreDeleteError,
        });
      }
    },
    [order, addDocumentMutation, placementId],
  );

  return (
    <OrderContext.Provider
      value={{
        currentItem,
        setCurrentItem,
        currentView,
        setCurrentView,
        saveItem,
        removeItem,
        selectedItem,
        setSelectedItem,
        order,
        saveOrder,
        createOrder: newOrder,
        addDocument: {
          mutation: addDocument,
          pending: addDocumentMutation.isPending,
        },
      }}
    >
      {firstLoad ? <>{children}</> : <h1>Ładowanie danych oferty...</h1>}
    </OrderContext.Provider>
  );
}
