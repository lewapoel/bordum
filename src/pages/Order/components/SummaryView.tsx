import clsx from 'clsx';
import { OrderData, OrderItem } from '../../../models/bitrix/order.ts';
import {
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { OrderContext, OrderType, OrderView } from '../../../models/order.ts';
import { DocumentType } from '../../../api/comarch/document.ts';

interface SummaryRowProps {
  index: number;
  selectedItem: number;
  setSelectedItem: (index: number) => void;
  item?: OrderItem;
  editItemQuantity: (index: number, quantity: number) => void;
  className?: string;
  selectItem: () => void;
  quantitiesRef: RefObject<Array<HTMLInputElement | null>>;
}

function SummaryRow({
  index,
  setSelectedItem,
  selectItem,
  selectedItem,
  item,
  editItemQuantity,
  className,
  quantitiesRef,
}: SummaryRowProps) {
  return (
    <tr
      onMouseEnter={() => setSelectedItem(index)}
      onClick={() => selectItem()}
      className={clsx(
        selectedItem === index ? 'bg-gray-300' : '',
        'cursor-pointer',
        className,
      )}
    >
      <td>{index + 1}</td>
      <td>{item?.productName}</td>
      <td>
        {item ? (
          <input
            ref={(el) => {
              quantitiesRef.current[index] = el;
            }}
            className='w-[50px]'
            type='number'
            min={0}
            value={item.quantity}
            onChange={(e) => editItemQuantity(index, +e.target.value)}
          />
        ) : (
          <></>
        )}
      </td>
      <td>{item?.unit}</td>
      <td>{item?.unitPrice.toFixed(2)}</td>
      <td>{item ? (item.unitPrice * item.quantity).toFixed(2) : null}</td>
    </tr>
  );
}

interface SummaryViewProps {
  order: OrderData;
  orderType: OrderType;
}

export default function SummaryView({ order, orderType }: SummaryViewProps) {
  const ctx = useContext(OrderContext);

  const quantitiesRef = useRef<Array<HTMLInputElement | null>>([]);

  const sum = useMemo(
    () =>
      order.items.reduce((acc, item) => {
        acc += item.unitPrice * item.quantity;
        return acc;
      }, 0),
    [order],
  );

  const saveOrder = useCallback(() => {
    if (ctx) {
      switch (orderType) {
        case OrderType.Create:
          void ctx.createOrder();
          break;
        case OrderType.Edit:
          void ctx.saveOrder();
          break;
      }
    }
  }, [ctx, orderType]);

  const selectItem = useCallback(() => {
    // Allow selecting only last additional row for creating new entries
    if (ctx && ctx.selectedItem === order.items.length) {
      ctx.setCurrentView(OrderView.Items);
    }
  }, [ctx, order.items.length]);

  const selectRowQuantity = useCallback(
    (index: number) => {
      if (index < 0 || index >= order.items.length) {
        if (document.activeElement instanceof HTMLInputElement) {
          document.activeElement.blur();
        }

        return;
      }

      const quantityRef = quantitiesRef.current?.[index];
      quantityRef?.focus();
      quantityRef?.select();
    },
    [order.items],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();

          if (ctx) {
            const newSelectedItem = Math.max(0, ctx.selectedItem - 1);
            ctx.setSelectedItem(newSelectedItem);
            selectRowQuantity(newSelectedItem);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();

          if (ctx) {
            // Max index is order.length, because there is an additional empty item for adding new rows
            const newSelectedItem = Math.min(
              order.items.length,
              ctx.selectedItem + 1,
            );
            ctx.setSelectedItem(newSelectedItem);
            selectRowQuantity(newSelectedItem);
          }
          break;
        case 'Enter':
          selectItem();
          break;
        case 'Insert':
          saveOrder();
          break;
        case 'Delete':
          if (ctx) {
            ctx.removeItem();
          }
          break;
        case 'Home':
          if (orderType === OrderType.Edit && ctx) {
            void ctx.addDocument.mutation(DocumentType.RELEASE_DOCUMENT);
          }
          break;
        case 'PageUp':
          if (orderType === OrderType.Edit && ctx) {
            void ctx.addDocument.mutation(DocumentType.PROFORMA_DOCUMENT);
          }
          break;
        case 'Tab':
          e.preventDefault();

          if (ctx) {
            selectRowQuantity(ctx.selectedItem);
          }
          break;
        default:
          break;
      }
    },
    [
      ctx,
      order.items.length,
      orderType,
      saveOrder,
      selectItem,
      selectRowQuantity,
    ],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    selectRowQuantity(0);
  }, []);

  return ctx ? (
    <div className='flex flex-col items-center'>
      <h1 className='mb-5'>Oferta</h1>

      {orderType === OrderType.Edit && (
        <div className='justify-center flex items-center gap-2 mb-5'>
          <button
            className={clsx(ctx.addDocument.pending ? 'disabled' : '')}
            disabled={ctx.addDocument.pending}
            onClick={() =>
              ctx.addDocument.mutation(DocumentType.RELEASE_DOCUMENT)
            }
          >
            {ctx.addDocument.pending
              ? 'Czekaj...'
              : 'Utwórz dokument WZ (HOME)'}
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
      )}

      <div className='justify-center flex items-center gap-2 mb-10'>
        <button className='confirm' onClick={saveOrder}>
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
              quantitiesRef={quantitiesRef}
              selectItem={selectItem}
              key={idx}
              setSelectedItem={ctx.setSelectedItem}
              editItemQuantity={ctx.editItemQuantity}
              selectedItem={ctx.selectedItem}
              index={idx}
              item={item}
            />
          ))}
          <SummaryRow
            quantitiesRef={quantitiesRef}
            selectItem={selectItem}
            editItemQuantity={ctx.editItemQuantity}
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
