import SummaryView from './components/SummaryView.tsx';
import { useCallback, useContext, useEffect, useState } from 'react';
import { OrderData, OrderItem } from '../../models/bitrix/order.ts';
import ItemsView from './components/ItemsView.tsx';
import ItemView from './components/ItemView.tsx';
import { ItemWarehouses } from '../../api/comarch/item.ts';
import { getCurrentPlacementId } from '../../utils/bitrix24.ts';
import { getOrder, updateOrder } from '../../api/bitrix24/order.ts';
import update from 'immutability-helper';
import { useAddDocument, DocumentType } from '../../api/comarch/document.ts';
import { AuthContext } from '../../api/comarch/auth.ts';
import { OrderContext, OrderView } from '../../models/order.ts';

export default function Order() {
  const { token } = useContext(AuthContext);
  const placementId = getCurrentPlacementId();
  const [order, setOrder] = useState<OrderData>();
  const [selectedItem, setSelectedItem] = useState(0);
  const [currentView, setCurrentView] = useState<OrderView>(OrderView.Summary);
  const [currentItem, setCurrentItem] = useState<ItemWarehouses>();
  const [firstLoad, setFirstLoad] = useState(false);

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

  useEffect(() => {
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
  }, [placementId]);

  return (
    <OrderContext.Provider
      value={{
        currentItem,
        setCurrentItem,
        setCurrentView,
        saveItem,
        removeItem,
        selectedItem,
        setSelectedItem,
        saveOrder,
        addDocument: {
          mutation: addDocument,
          pending: addDocumentMutation.isPending,
        },
      }}
    >
      {firstLoad && order ? (
        <>
          {currentView === OrderView.Summary && <SummaryView order={order} />}
          {currentView === OrderView.Items && <ItemsView />}
          {currentView === OrderView.Item && <ItemView />}
        </>
      ) : (
        <h1>Ładowanie danych zamówienia...</h1>
      )}
    </OrderContext.Provider>
  );
}
