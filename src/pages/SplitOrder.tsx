import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentPlacementId } from '../utils/bitrix24';
import { OrderItem } from '../models/bitrix/order.ts';
import { getOrder, hasOrderDeals, splitOrder } from '../api/bitrix/order.ts';
import { calculateUnitPrice } from '@/utils/item.ts';
import { formatMoney } from '@/utils/money.ts';

function SplitOrder() {
  const placementId = getCurrentPlacementId();

  const [order, setOrder] = useState<Array<OrderItem>>([]);
  const [subOrder, setSubOrder] = useState<Array<OrderItem>>([]);
  const [firstLoad, setFirstLoad] = useState(false);
  const [pending, setPending] = useState(false);
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
        acc += calculateUnitPrice(item) * item.quantity;
        return acc;
      }, 0),
    [],
  );

  const orderQuantity = useMemo(
    () => reduceQuantity(order),
    [order, reduceQuantity],
  );

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
        'Nie można podzielić oferty, podoferta musi mieć minimum jedną ilość produktu',
      );
      return;
    }

    if (subOrderQuantity === orderQuantity) {
      alert(
        'Nie można podzielić oferty, podoferta ma taką samą wartość jak oferta główna',
      );
      return;
    }

    if (!placementId) {
      alert('Nie można pobrać ID aktualnej oferty');
      return;
    }

    setPending(true);
    splitOrder(placementId, {
      order: orderResult,
      subOrder: subOrderResult,
      title: 'podoferta',
    }).then(() => setPending(false));
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
      {firstLoad && (isDeal || hasDeal) && !pending ? (
        <>
          <h1 className='mb-5'>Podoferta</h1>
          <p className='font-bold mb-2'>
            Łączna kwota podoferty: {formatMoney(subOrderSum)}
          </p>

          <div className='justify-center flex items-center gap-2 mb-10'>
            <button
              className='place-order mt-5 confirm'
              onClick={handleSplitOrder}
            >
              Podziel ofertę (ENTER)
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
                <th>Ilość do wydzielenia</th>
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
                    <td>{order[idx].quantity}</td>
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
                    <td>{formatMoney(calculateUnitPrice(item))}</td>
                    <td>
                      {formatMoney(calculateUnitPrice(item) * item.quantity)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      ) : (
        <>
          {!firstLoad ? (
            <h1>Ładowanie danych oferty...</h1>
          ) : (
            <>
              {!isDeal && !hasDeal && (
                <h1>
                  Dzielenie oferty dostępne tylko dla ofert powiązanych z dealem
                </h1>
              )}
              {pending && <h1>Tworzenie podoferty...</h1>}
            </>
          )}
        </>
      )}
    </>
  );
}

export default SplitOrder;
