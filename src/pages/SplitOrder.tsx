import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getBitrix24, getCurrentPlacementId } from '../utils/bitrix24';
import { OrderItem } from '../models/bitrix/order.ts';
import { getOrder, hasOrderDeals, updateOrder } from '../api/bitrix24/order.ts';
import { ORDER_MAIN_LINK_FIELD } from '../api/bitrix24/field.ts';

function SplitOrder() {
  const placementId = getCurrentPlacementId();

  const [order, setOrder] = useState<Array<OrderItem>>([]);
  const [subOrder, setSubOrder] = useState<Array<OrderItem>>([]);
  const [firstLoad, setFirstLoad] = useState(false);
  const [isDeal, setIsDeal] = useState<boolean>(false);
  const [hasDeal, setHasDeal] = useState<boolean>(false);

  const quantitiesRef = useRef<Array<HTMLInputElement | null>>([]);

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

  const handleSplitOrder = useCallback(() => {
    if (subOrderQuantity === 0) {
      alert(
        'Nie można podzielić zamówienia, podzamówienie musi mieć minimum jedną ilość produktu',
      );
      return;
    }

    if (subOrderQuantity === orderQuantity) {
      alert(
        'Nie można podzielić zamówienia, podzamówienie ma taką samą wartość jak zamówienie główne',
      );
      return;
    }

    if (!placementId) {
      alert('Nie można pobrać ID aktualnej oferty');
      return;
    }

    const bx24 = getBitrix24();
    if (!bx24) {
      return;
    }

    const addEstimateCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się utworzyć oferty. Szczegóły w konsoli');
      } else {
        updateOrder(result.data(), subOrderResult, false, false).then(() =>
          alert('Zamówienie podzielone pomyślnie'),
        );
      }
    };

    const getEstimateCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się pobrać danych oferty. Szczegóły w konsoli');
      } else {
        const estimateData = result.data();
        const id = estimateData.ID;

        delete estimateData.ID; // Not needed for creating new estimate

        const quoteData = {
          fields: {
            ...estimateData,
            TITLE: `${estimateData.TITLE} - podzamówienie`,
          },
        };

        quoteData.fields[ORDER_MAIN_LINK_FIELD] =
          `https://bordum.bitrix24.pl/crm/type/7/details/${id}/`;

        // Add new estimate
        bx24.callMethod('crm.quote.add', quoteData, addEstimateCallback);

        void updateOrder(placementId, orderResult, false, false);
      }
    };

    bx24.callMethod('crm.quote.get', { id: placementId }, getEstimateCallback);
  }, [
    orderQuantity,
    orderResult,
    placementId,
    subOrderQuantity,
    subOrderResult,
  ]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
          handleSplitOrder();
          break;
        case 'Tab':
          e.preventDefault();

          if (quantitiesRef.current) {
            const currentIdx = quantitiesRef.current.findIndex(
              (quantityRef) => quantityRef === document.activeElement,
            );

            let nextIdx = 0;
            if (currentIdx !== -1) {
              nextIdx = (currentIdx + 1) % quantitiesRef.current.length;
            }

            quantitiesRef.current[nextIdx]?.focus();
            quantitiesRef.current[nextIdx]?.select();
          }

          break;

        default:
          break;
      }
    },
    [handleSplitOrder],
  );

  useEffect(() => {
    if (!placementId) {
      return;
    }

    hasOrderDeals(placementId).then((res) => setHasDeal(res));

    getOrder(placementId).then((res) => {
      if (res) {
        setOrder(res.items);
        setSubOrder(res.items.map((item) => ({ ...item, quantity: 0 })));
        setIsDeal(!!res.dealId);
        setFirstLoad(true);
      }
    });
  }, [placementId]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <>
      {firstLoad ? (
        isDeal || hasDeal ? (
          <>
            <h1 className='mb-5'>Zamówienie</h1>
            <p className='font-bold mb-2'>
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

            <h1 className='mb-5'>Podzamówienie</h1>
            <p className='font-bold mb-2'>
              Łączna kwota podzamówienia: {subOrderSum.toFixed(2)}
            </p>

            <div className='justify-center flex items-center gap-2 mb-10'>
              <button
                className='place-order mt-5 confirm'
                onClick={handleSplitOrder}
              >
                Podziel zamówienie (ENTER)
              </button>
            </div>

            <div className='text-[20px] justify-center flex items-center gap-4 mb-10'>
              <p>Zmień pole (TAB)</p>
            </div>

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
                          ref={(el) => {
                            quantitiesRef.current[idx] = el;
                          }}
                          type='number'
                          min='0'
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
          </>
        ) : (
          <h1>Dzielenie zamówienia dostępne tylko dla ofert z deali</h1>
        )
      ) : (
        <h1>Ładowanie danych zamówienia...</h1>
      )}
    </>
  );
}

export default SplitOrder;
