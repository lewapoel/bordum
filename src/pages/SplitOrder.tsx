import { useCallback, useEffect, useMemo, useState } from "react";
import { getBitrix24, getCurrentPlacementId } from "../utils/bitrix24";
import { OrderItem } from "../models/order.ts";
import { getOrder, updateOrder } from "../api/bitrix24/order.ts";

function SplitOrder() {
  const placementId = getCurrentPlacementId();

  const [order, setOrder] = useState<Array<OrderItem>>([]);
  const [subOrder, setSubOrder] = useState<Array<OrderItem>>([]);
  const [firstLoad, setFirstLoad] = useState(false);

  const reduceQuantity = useCallback(
    (o: Array<OrderItem>) =>
      o.reduce((total, item) => {
        total += item.quantity;
        return total;
      }, 0),
    [],
  );

  const reduceSum = useCallback(
    (o: Array<OrderItem>) =>
      o.reduce((acc, item) => {
        acc += item.unitPrice * item.quantity;
        return acc;
      }, 0),
    [],
  );

  const orderQuantity = useMemo(
    () => reduceQuantity(order),
    [order, reduceQuantity],
  );
  const orderSum = useMemo(() => reduceSum(order), [order, reduceSum]);

  const subOrderQuantity = useMemo(
    () => reduceQuantity(subOrder),
    [subOrder, reduceQuantity],
  );
  const subOrderSum = useMemo(() => reduceSum(subOrder), [subOrder, reduceSum]);

  // Resulting order from the split
  const orderResult = useMemo(
    () =>
      order.reduce((acc: Array<OrderItem>, item, idx) => {
        const quantity = item.quantity - subOrder[idx].quantity;
        if (quantity > 0) {
          acc.push({ ...item, quantity });
        }

        return acc;
      }, []),
    [order, subOrder],
  );

  // Resulting suborder from the split
  const subOrderResult = useMemo(
    () => subOrder.filter((item) => item.quantity > 0),
    [subOrder],
  );

  // Let user choose up to the original order item’s qty
  const updateSubOrderItem = useCallback(
    (idx: number, value: string) => {
      setSubOrder((prev) => {
        const maxAllowed = order[idx].quantity;

        const newPrev = [...prev];
        newPrev[idx].quantity = Math.min(maxAllowed, Math.max(0, +value));

        return newPrev;
      });
    },
    [order],
  );

  const handleSplitOrder = () => {
    if (subOrderQuantity === 0) {
      alert(
        "Nie można podzielić zamówienia, podzamówienie musi mieć minimum jedną ilość produktu",
      );
      return;
    }

    if (subOrderQuantity === orderQuantity) {
      alert(
        "Nie można podzielić zamówienia, podzamówienie ma taką samą wartość jak zamówienie główne",
      );
      return;
    }

    if (!placementId) {
      alert("Nie można pobrać ID aktualnej oferty");
      return;
    }

    const bx24 = getBitrix24();
    if (!bx24) {
      return;
    }

    const addEstimateCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert("Nie udało się utworzyć oferty. Szczegóły w konsoli");
      } else {
        alert("Nowa oferta utworzone pomyślnie");
        void updateOrder(result.data(), subOrderResult, false);
      }
    };

    const getEstimateCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert("Nie udało się pobrać danych oferty. Szczegóły w konsoli");
      } else {
        const estimateData = result.data();
        delete estimateData.ID; // Not needed for creating new estimate

        // Add new estimate
        bx24.callMethod(
          "crm.quote.add",
          { fields: estimateData },
          addEstimateCallback,
        );

        void updateOrder(placementId, orderResult, false);
      }
    };

    bx24.callMethod("crm.quote.get", { id: placementId }, getEstimateCallback);
  };

  useEffect(() => {
    if (!placementId) {
      return;
    }

    getOrder(placementId).then((res) => {
      if (res) {
        setOrder(res);
        setSubOrder(res.map((item) => ({ ...item, quantity: 0 })));
        setFirstLoad(true);
      }
    });
  }, [placementId]);

  return (
    <>
      {firstLoad ? (
        <>
          <h1 className="mb-5">Zamówienie</h1>
          <p className="font-bold mb-2">
            Łączna kwota zamówienia: {orderSum.toFixed(2)}
          </p>
          <table>
            <thead>
              <tr>
                <th>Lp.</th>
                <th>Nazwa towaru</th>
                <th>Ilość</th>
                <th>Jedn. miary</th>
                <th>Cena jedn.</th>
                <th>Wartość</th>
              </tr>
            </thead>
            <tbody>
              {order.length === 0 ? (
                <tr>
                  <td colSpan={6}>Brak wybranych produktów.</td>
                </tr>
              ) : (
                order.map((item, idx) => (
                  <tr key={item.id}>
                    <td>{idx + 1}</td>
                    <td>{item.productName}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unit}</td>
                    <td>{item.unitPrice}</td>
                    <td>{(item.unitPrice * item.quantity).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <hr />

          <h1 className="mb-5">Podzamówienie</h1>
          <p className="font-bold mb-2">
            Łączna kwota podzamówienia: {subOrderSum.toFixed(2)}
          </p>
          <table>
            <thead>
              <tr>
                <th>Lp.</th>
                <th>Nazwa towaru</th>
                <th>Ilość</th>
                <th>Jedn. miary</th>
                <th>Cena jedn.</th>
                <th>Wartość</th>
              </tr>
            </thead>
            <tbody>
              {subOrder.length === 0 ? (
                <tr>
                  <td colSpan={6}>Brak produktów do podziału.</td>
                </tr>
              ) : (
                subOrder.map((item, idx) => (
                  <tr key={item.id}>
                    <td>{idx + 1}</td>
                    <td>{item.productName}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max={order[idx].quantity} // can't exceed original quantity
                        value={item.quantity}
                        onChange={(e) =>
                          updateSubOrderItem(idx, e.target.value)
                        }
                      />
                    </td>
                    <td>{item.unit}</td>
                    <td>{item.unitPrice}</td>
                    <td>{(item.unitPrice * item.quantity).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <button className="place-order mt-5" onClick={handleSplitOrder}>
            Podziel zamówienie
          </button>
        </>
      ) : (
        <h1>Ładowanie danych zamówienia...</h1>
      )}
    </>
  );
}

export default SplitOrder;
