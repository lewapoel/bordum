import SummaryView from "./components/SummaryView.tsx";
import { useCallback, useEffect, useState } from "react";
import { OrderContext, OrderItem, OrderView } from "../../models/order.ts";
import ItemsView from "./components/ItemsView.tsx";
import ItemView from "./components/ItemView.tsx";
import { ItemWarehouses } from "../../api/comarch/item.ts";
import { getBitrix24, getCurrentPlacementId } from "../../utils/bitrix24.ts";
import { getOrder, updateOrder } from "../../api/bitrix24/order.ts";

export default function Order() {
  const placementId = getCurrentPlacementId();
  const [order, setOrder] = useState<Array<OrderItem>>([]);
  const [selectedItem, setSelectedItem] = useState(0);
  const [currentView, setCurrentView] = useState<OrderView>(OrderView.Summary);
  const [currentItem, setCurrentItem] = useState<ItemWarehouses>();
  const [firstLoad, setFirstLoad] = useState(false);

  const saveItem = useCallback(
    (item: OrderItem) => {
      // Adding new item when `selectedItem` is out of range
      if (selectedItem === order.length) {
        setOrder([...order, item]);
      } else {
        const newOrder = [...order];
        newOrder[selectedItem] = item;

        setOrder(newOrder);
      }
    },
    [selectedItem, order],
  );

  const removeItem = useCallback(() => {
    if (selectedItem < order.length) {
      const newOrder = [...order];
      newOrder.splice(selectedItem, 1);

      setOrder(newOrder);
    }
  }, [selectedItem, order]);

  const saveOrder = useCallback(async () => {
    void updateOrder(placementId, order, true);
  }, [placementId, order]);

  useEffect(() => {
    if (!placementId) {
      alert("Nie można pobrać ID aktualnej oferty");
      return;
    }

    getBitrix24().reloadWindow();

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
      }}
    >
      {firstLoad ? (
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
