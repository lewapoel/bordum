import clsx from 'clsx';
import { OrderData, OrderItem } from '../../../models/bitrix/order.ts';
import { useCallback, useContext, useEffect, useMemo } from 'react';
import { OrderContext, OrderView } from '../../../models/order.ts';
import { DocumentType } from '../../../api/comarch/document.ts';

interface SummaryRowProps {
  index: number;
  selectedItem: number;
  setSelectedItem: (index: number) => void;
  item?: OrderItem;
  className?: string;
  setCurrentView: (view: OrderView) => void;
}

function SummaryRow({
  index,
  setSelectedItem,
  setCurrentView,
  selectedItem,
  item,
  className,
}: SummaryRowProps) {
  return (
    <tr
      onMouseEnter={() => setSelectedItem(index)}
      onClick={() => setCurrentView(OrderView.Items)}
      className={clsx(
        selectedItem === index ? 'bg-gray-300' : '',
        'cursor-pointer',
        className,
      )}
    >
      <td>{index + 1}</td>
      <td>{item?.productName}</td>
      <td>{item?.quantity}</td>
      <td>{item?.unit}</td>
      <td>{item?.unitPrice}</td>
      <td>{item ? (item.unitPrice * item.quantity).toFixed(2) : null}</td>
    </tr>
  );
}

interface SummaryViewProps {
  order: OrderData;
}

export default function SummaryView({ order }: SummaryViewProps) {
  const ctx = useContext(OrderContext);

  const sum = useMemo(
    () =>
      order.items.reduce((acc, item) => {
        acc += item.unitPrice * item.quantity;
        return acc;
      }, 0),
    [order],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          if (ctx) {
            ctx.setSelectedItem(Math.max(0, ctx.selectedItem - 1));
          }
          break;
        case 'ArrowDown':
          if (ctx) {
            // Max index is order.length, because there is an additional empty item for adding new rows
            ctx.setSelectedItem(
              Math.min(order.items.length, ctx.selectedItem + 1),
            );
          }
          break;
        case 'Enter':
          if (ctx) {
            ctx.setCurrentView(OrderView.Items);
          }
          break;
        case 'Insert':
          if (ctx) {
            void ctx.saveOrder();
          }
          break;
        case 'Delete':
          if (ctx) {
            ctx.removeItem();
          }
          break;
        case 'Home':
          if (ctx) {
            void ctx.addDocument.mutation(DocumentType.RELEASE_DOCUMENT);
          }
          break;
        case 'PageUp':
          if (ctx) {
            void ctx.addDocument.mutation(DocumentType.PROFORMA_DOCUMENT);
          }
          break;
        default:
          break;
      }
    },
    [ctx, order],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return ctx ? (
    <div className='flex flex-col items-center'>
      <h1 className='mb-5'>Oferta</h1>

      <div className='justify-center flex items-center gap-2 mb-5'>
        <button
          className={clsx(ctx.addDocument.pending ? 'disabled' : '')}
          disabled={ctx.addDocument.pending}
          onClick={() =>
            ctx.addDocument.mutation(DocumentType.RELEASE_DOCUMENT)
          }
        >
          {ctx.addDocument.pending ? 'Czekaj...' : 'Utwórz dokument WZ (HOME)'}
        </button>

        <button
          className={clsx(ctx.addDocument.pending ? 'disabled' : '')}
          disabled={ctx.addDocument.pending}
          onClick={() =>
            ctx.addDocument.mutation(DocumentType.PROFORMA_DOCUMENT, true)
          }
        >
          {ctx.addDocument.pending
            ? 'Czekaj...'
            : 'Utwórz fakturę proforma (PAGEUP)'}
        </button>
      </div>

      <div className='justify-center flex items-center gap-2 mb-10'>
        <button className='confirm' onClick={ctx.saveOrder}>
          Zapisz (INSERT)
        </button>
        <button className='delete' onClick={ctx.removeItem}>
          Usuń zaznaczoną pozycję (DELETE)
        </button>
      </div>

      <div className='text-[20px] justify-center flex items-center gap-4 mb-10'>
        <p>Zmień zaznaczoną pozycję (↑/↓)</p>
        <p>Dodaj/modyfikuj pozycję (ENTER)</p>
      </div>

      <h2 className='mb-5 font-bold'>Wartość całkowita: {sum.toFixed(2)}</h2>
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
          {order.items.map((item, idx) => (
            <SummaryRow
              setCurrentView={ctx.setCurrentView}
              key={idx}
              setSelectedItem={ctx.setSelectedItem}
              selectedItem={ctx.selectedItem}
              index={idx}
              item={item}
            />
          ))}
          <SummaryRow
            setCurrentView={ctx.setCurrentView}
            setSelectedItem={ctx.setSelectedItem}
            selectedItem={ctx.selectedItem}
            index={order.items.length}
          />
        </tbody>
      </table>
    </div>
  ) : (
    <></>
  );
}
