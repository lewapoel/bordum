import { PRICES } from '../../../data/prices.ts';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { OrderContext, OrderView } from '../../../models/order.ts';

export default function ItemView() {
  const ctx = useContext(OrderContext);
  const [selectedPrice, setSelectedPrice] = useState('zakupu');
  const [quantity, setQuantity] = useState('0');

  const quantityRef = useRef<HTMLInputElement>(null);
  const pricesRef = useRef<HTMLSelectElement>(null);

  const price = useMemo(
    () => ctx?.currentItem?.prices[selectedPrice],
    [ctx, selectedPrice],
  );

  const addItem = useCallback(() => {
    if (!ctx?.currentItem) {
      return;
    }

    if (isNaN(+quantity) || +quantity <= 0) {
      alert('Nieprawidłowa ilość');
      return;
    }

    ctx.saveItem({
      id: ctx.currentItem.id,
      productName: ctx.currentItem.name,
      quantity: +quantity,
      unit: ctx.currentItem.unit,
      unitPrice: ctx.currentItem.prices[selectedPrice].value,
    });
    ctx.setCurrentView(OrderView.Summary);
  }, [ctx, selectedPrice, quantity]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
          addItem();
          break;
        case 'Escape':
          if (ctx) {
            ctx.setCurrentView(OrderView.Items);
          }
          break;
        case 'Tab':
          e.preventDefault();

          if (document.activeElement === pricesRef.current) {
            quantityRef.current?.focus();
          } else {
            pricesRef.current?.focus();
          }

          break;
        default:
          break;
      }
    },
    [ctx, addItem],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return ctx?.currentItem && price ? (
    <div>
      <h1 className='mb-5'>Towar</h1>

      <div className='justify-center flex items-center gap-2 mb-10'>
        <button className='confirm' onClick={() => addItem()}>
          Potwierdź (ENTER)
        </button>
        <button
          className='delete'
          onClick={() => ctx.setCurrentView(OrderView.Items)}
        >
          Anuluj (ESC)
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Nazwa towaru</th>
            <th>Ilość</th>
            <th>Jedn. miary</th>
            <th>Rodzaj ceny</th>
            <th>Cena jedn.</th>
            <th>Wartość</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{ctx.currentItem.name}</td>
            <td>
              <input
                ref={quantityRef}
                type='number'
                min={0}
                // max={} TODO
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </td>
            <td>{ctx.currentItem.unit}</td>
            <td>
              <select
                ref={pricesRef}
                className='prices'
                value={selectedPrice}
                onChange={(e) => setSelectedPrice(e.target.value)}
              >
                {PRICES.map((price, idx) => (
                  <option value={price} key={idx}>
                    {price}
                  </option>
                ))}
              </select>
            </td>
            <td>{price.value}</td>
            <td>{(price.value * +quantity).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  ) : (
    <></>
  );
}
