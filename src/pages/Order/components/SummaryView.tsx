import clsx from 'clsx';
import { OrderData, OrderItem, PackagingData } from '@/models/bitrix/order.ts';
import {
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { OrderContext, OrderType, OrderView } from '@/models/order.ts';
import { DocumentType } from '@/api/comarch/document.ts';
import { formatMoney } from '@/utils/money.ts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { calculateUnitPrice } from '@/utils/item.ts';
import { PRODUCT_TYPES } from '@/data/comarch/product.ts';

interface SummaryRowProps {
  index: number;
  selectedItem: number;
  item?: OrderItem;
  editItemQuantity: (index: number, quantity: number) => number | null;
  className?: string;
  selectItem: (index: number) => void;
  quantitiesRef: RefObject<Array<HTMLInputElement | null>>;
  packagingData?: PackagingData;
}

function SummaryRow({
  index,
  selectItem,
  selectedItem,
  item,
  editItemQuantity,
  className,
  quantitiesRef,
  packagingData,
}: SummaryRowProps) {
  const [tempQuantity, setTempQuantity] = useState(item?.quantity ?? '');
  const packagingItem = item?.id ? packagingData?.[item.id] : undefined;

  useEffect(() => {
    if (tempQuantity !== '' && +tempQuantity > 0) {
      setTempQuantity(editItemQuantity(index, +tempQuantity) ?? '');
    }
  }, [tempQuantity, editItemQuantity, index]);

  return (
    <tr
      onClick={() => {
        selectItem(index);
      }}
      className={clsx(
        selectedItem === index ? 'bg-gray-300' : '',
        'cursor-pointer',
        className,
      )}
    >
      <td>{index + 1}</td>
      <td>{item?.productName}</td>
      <td>
        {item ? (item.type !== undefined ? PRODUCT_TYPES[item.type] : '-') : ''}
      </td>
      <td>
        {item ? (
          <input
            disabled={packagingItem?.saved}
            ref={(el) => {
              quantitiesRef.current[index] = el;
            }}
            className='w-[100px] text-center'
            type='number'
            min={1}
            value={tempQuantity}
            onChange={(e) => setTempQuantity(e.target.value)}
          />
        ) : (
          <></>
        )}
      </td>
      <td>{item?.unit}</td>
      <td>{item ? formatMoney(calculateUnitPrice(item)) : null}</td>
      <td>
        {item ? formatMoney(calculateUnitPrice(item) * item.quantity) : null}
      </td>
    </tr>
  );
}

interface SummaryViewProps {
  order: OrderData;
  orderType: OrderType;
}

export default function SummaryView({ order, orderType }: SummaryViewProps) {
  const ctx = useContext(OrderContext);

  const [exceededCreditVisible, setExceededCreditVisible] = useState(false);
  const quantitiesRef = useRef<Array<HTMLInputElement | null>>([]);

  const sum = useMemo(
    () =>
      order.items.reduce((acc, item) => {
        acc += calculateUnitPrice(item) * item.quantity;
        return acc;
      }, 0),
    [order],
  );

  const saveOrder = useCallback(
    (ignoreLimit: boolean = false) => {
      if (ctx) {
        if (
          ctx.invoices.allowWarning &&
          !ignoreLimit &&
          ctx.invoices.client &&
          ctx.invoices.limitLeft - sum < 0
        ) {
          setExceededCreditVisible(true);
          return;
        }

        switch (orderType) {
          case OrderType.Create:
            if (ctx.order?.items && ctx.order.items.length > 0) {
              void ctx.createOrder();
            } else {
              alert('Nie można utworzyć pustej oferty');
            }
            break;
          case OrderType.Edit:
            void ctx.saveOrder();
            break;
        }
      }
    },
    [ctx, orderType, sum],
  );

  const selectItem = useCallback(
    (index: number) => {
      if (ctx) {
        ctx.setSelectedItem(index);

        // Allow selecting only last additional row for creating new entries
        if (index === order.items.length) {
          ctx.setCurrentView(OrderView.Items);
        }
      }
    },
    [ctx, order.items.length],
  );

  const selectRowQuantity = useCallback(
    (index: number) => {
      if (document.activeElement instanceof HTMLInputElement) {
        document.activeElement.blur();
      }

      if (index < 0 || index >= order.items.length) {
        return;
      }

      const quantityRef = quantitiesRef.current?.[index];
      quantityRef?.focus();
      quantityRef?.select();
    },
    [order.items],
  );

  const addDocument = useCallback(
    (documentType: DocumentType, exportDocument: boolean = true) => {
      if (orderType === OrderType.Edit && ctx) {
        if (
          documentType === DocumentType.RELEASE_DOCUMENT &&
          ctx.invoices.allowWarning &&
          ctx.invoices.client &&
          ctx.invoices.limitLeft - sum < 0
        ) {
          alert(
            'Przekroczono dostępny limit handlowy, nie można utworzyć dokumentu WZ',
          );
          return;
        }

        void ctx.addDocument.mutation(documentType, exportDocument);
      }
    },
    [ctx, orderType, sum],
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
          if (ctx) {
            selectItem(ctx.selectedItem);
          }
          break;
        case '1':
          if (e.altKey) {
            saveOrder();
          }
          break;
        case 'Delete':
          e.preventDefault();

          if (ctx) {
            ctx.removeItem();
          }
          break;
        case '2':
          if (e.altKey) {
            addDocument(DocumentType.RELEASE_DOCUMENT);
          }
          break;
        case '3':
          if (e.altKey) {
            addDocument(DocumentType.PROFORMA_DOCUMENT);
          }
          break;
        case '4':
          if (e.altKey) {
            addDocument(DocumentType.RESERVATION_DOCUMENT, false);
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
      saveOrder,
      selectItem,
      selectRowQuantity,
      addDocument,
    ],
  );

  const selectedItemId =
    ctx?.selectedItem !== undefined && order?.items
      ? order.items[ctx.selectedItem]?.id
      : undefined;
  const canDeleteSelectedItem = selectedItemId
    ? order?.packagingData?.[selectedItemId]?.saved !== true
    : true;

  console.log(canDeleteSelectedItem);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    selectRowQuantity(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ctx && !ctx.addDocument.pending && !ctx.pendingOrder ? (
    <div className='flex flex-col items-center'>
      <h1 className='mb-5'>Oferta nr {ctx.order!.id}</h1>

      {orderType === OrderType.Edit && (
        <div className='justify-center flex items-center gap-2 mb-5'>
          <button onClick={() => addDocument(DocumentType.RELEASE_DOCUMENT)}>
            Utwórz dokument WZ (Alt+2)
          </button>

          <button onClick={() => addDocument(DocumentType.PROFORMA_DOCUMENT)}>
            Utwórz fakturę proforma (Alt+3)
          </button>

          <button
            onClick={() =>
              addDocument(DocumentType.RESERVATION_DOCUMENT, false)
            }
          >
            Utwórz dokument rezerwacji (Alt+4)
          </button>
        </div>
      )}

      <div className='justify-center flex items-center gap-2 mb-10'>
        <button className='confirm' onClick={() => saveOrder()}>
          Zapisz (Alt+1)
        </button>
        <button
          disabled={!canDeleteSelectedItem}
          className={clsx('delete', canDeleteSelectedItem ? '' : 'disabled')}
          onClick={ctx.removeItem}
        >
          Usuń zaznaczoną pozycję (DELETE)
        </button>
      </div>

      <div className='text-[20px] justify-center flex items-center gap-4 mb-4'>
        <p>Zmień zaznaczoną pozycję (↑/↓)</p>
        <p>Dodaj/modyfikuj pozycję (ENTER)</p>
      </div>

      <Dialog open={exceededCreditVisible}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>UWAGA!</DialogTitle>
            <DialogDescription>
              Przekroczono dostępny limit handlowy!
            </DialogDescription>
          </DialogHeader>

          <div>Czy na pewno chcesz kontynuować?</div>

          <DialogFooter>
            <Button
              onClick={() => {
                setExceededCreditVisible(false);
                saveOrder(true);
              }}
              className='confirm'
            >
              TAK
            </Button>
            <Button
              onClick={() => setExceededCreditVisible(false)}
              className='delete'
            >
              NIE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {ctx.invoices.client && (
        <div className='text-[20px] flex items-center gap-4 mb-10 justify-center text-red-500'>
          <p>{ctx.invoices.client?.name}</p>
          <p>Dostępny limit handlowy: {formatMoney(ctx.invoices.limitLeft)}</p>
        </div>
      )}

      <div className='flex flex-col gap-2 font-bold mb-5'>
        <h2>Wartość całkowita: {formatMoney(sum)}</h2>
        <h2>Rodzaj ceny: {ctx.selectedPrice}</h2>
      </div>

      <table>
        <thead>
          <tr>
            <th>Lp.</th>
            <th>Nazwa towaru</th>
            <th>Rodzaj</th>
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
              editItemQuantity={ctx.editItemQuantity}
              selectedItem={ctx.selectedItem}
              index={idx}
              item={item}
              packagingData={order.packagingData}
            />
          ))}
          <SummaryRow
            quantitiesRef={quantitiesRef}
            selectItem={selectItem}
            editItemQuantity={ctx.editItemQuantity}
            selectedItem={ctx.selectedItem}
            index={order.items.length}
            packagingData={order.packagingData}
          />
        </tbody>
      </table>
    </div>
  ) : (
    <>
      {ctx && ctx.addDocument.pending && <h1>Tworzenie dokumentu...</h1>}
      {ctx && ctx.pendingOrder && <h1>Zapisywanie oferty...</h1>}
    </>
  );
}
