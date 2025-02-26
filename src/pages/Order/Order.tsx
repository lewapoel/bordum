import SummaryView from "./components/SummaryView.tsx";
import { useCallback, useState } from "react";
import { OrderContext, OrderItem, OrderView } from "../../models/order.ts";
import ItemsView from "./components/ItemsView.tsx";
import ItemView from "./components/ItemView.tsx";
import { ItemWarehouses } from "../../api/item.ts";
import {
  ensureMeasure,
  getBitrix24,
  getCurrentPlacementId,
  getMeasures,
} from "../../utils/bitrix24.ts";

export default function Order() {
  const placementId = getCurrentPlacementId();
  const [order, setOrder] = useState<Array<OrderItem>>([]);
  const [selectedItem, setSelectedItem] = useState(0);
  const [currentView, setCurrentView] = useState<OrderView>(OrderView.Summary);
  const [currentItem, setCurrentItem] = useState<ItemWarehouses>();
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

  const saveOrder = async () => {
    if (!placementId) {
      alert("Nie można pobrać ID aktualnej oferty");
      return;
    }

    const measures = await getMeasures();
    if (!measures) {
      return;
    }

    for (const item of order) {
      const code = await ensureMeasure(measures, item.unit);
      if (!code) {
        alert(
          `Nie udało się ustalić kodu jednostki produktu: ${item.productName}`,
        );
        return;
      }

      item.unitCode = code;
    }

    const bx24 = getBitrix24();

    const setProductRowsCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert("Nie udało się zapisać produktów oferty. Szczegóły w konsoli");
      } else {
        alert("Produkty oferty zapisane pomyślnie");
      }
    };

    const updateBody = {
      id: placementId,
      rows: order.map((item) => ({
        PRODUCT_NAME: item.productName,
        PRICE: item.unitPrice,
        QUANTITY: item.quantity,
        MEASURE_CODE: item.unitCode,
      })),
    };

    bx24.callMethod(
      "crm.quote.productrows.set",
      updateBody,
      setProductRowsCallback,
    );
  };

  return (
    <OrderContext.Provider
      value={{
        currentItem,
        setCurrentItem,
        setCurrentView,
        saveItem,
        selectedItem,
        setSelectedItem,
        saveOrder,
      }}
    >
      {currentView === OrderView.Summary && <SummaryView order={order} />}
      {currentView === OrderView.Items && <ItemsView />}
      {currentView === OrderView.Item && <ItemView />}
    </OrderContext.Provider>
  );
}
