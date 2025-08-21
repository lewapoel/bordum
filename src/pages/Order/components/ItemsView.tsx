import {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useGetWarehouses } from '@/api/comarch/warehouse.ts';
import {
  ItemWarehouses,
  useGetItems,
  useGetItemsWarehouses,
} from '@/api/comarch/item.ts';
import { OrderContext, OrderView } from '@/models/order.ts';
import { useFuzzySearchList, Highlight } from '@nozbe/microfuzz/react';
import clsx from 'clsx';
import { HighlightRanges } from '@nozbe/microfuzz';
import update from 'immutability-helper';
import { toast } from 'react-toastify';
import { AuthContext } from '@/components/AuthContext.tsx';

type Match = {
  item: ItemWarehouses;
  highlightRanges: HighlightRanges | null;
};

type RowElements = {
  quantity: HTMLInputElement | null;
  discount: HTMLInputElement | null;
};

type RowsElements = {
  [key: number]: RowElements;
};

type Quantities = {
  [key: number]: string;
};

type Discounts = {
  [key: number]: string;
};

export default function ItemsView() {
  const { token } = useContext(AuthContext);
  const ctx = useContext(OrderContext);

  const warehousesQuery = useGetWarehouses(token);
  const itemsQuery = useGetItems(token);
  const itemsWarehousesQuery = useGetItemsWarehouses(
    token,
    itemsQuery.data,
    warehousesQuery.data,
  );

  const warehouses = warehousesQuery.data;
  const itemsWarehouses = useMemo(
    () =>
      itemsWarehousesQuery.data
        ? Object.values(itemsWarehousesQuery.data)
        : null,
    [itemsWarehousesQuery.data],
  );

  const sortedItemsWarehouses = useMemo(
    () =>
      itemsWarehouses
        ? itemsWarehouses.toSorted(
            (a, b) =>
              Math.max(...Object.values(b.quantities).map((x) => x.quantity)) -
              Math.max(...Object.values(a.quantities).map((x) => x.quantity)),
          )
        : null,
    [itemsWarehouses],
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(0);

  const [quantities, setQuantities] = useState<Quantities>({});
  const [discounts, setDiscounts] = useState<Discounts>({});

  const searchBarRef = useRef<HTMLInputElement>(null);
  const rowsRef = useRef<RowsElements>(null);

  const filteredList = useFuzzySearchList<ItemWarehouses, Match>({
    list: sortedItemsWarehouses ?? [],
    queryText: searchTerm,
    key: 'name',
    mapResultItem: ({ item, matches: [highlightRanges] }) => ({
      item,
      highlightRanges,
    }),
  });

  const selectItem = useCallback(
    (item: ItemWarehouses) => {
      if (ctx) {
        const quantity = quantities[item.id];
        const discount = discounts[item.id] ?? 0;

        if (isNaN(+quantity) || +quantity <= 0) {
          toast.error('Nieprawidłowa ilość', {
            position: 'top-center',
            theme: 'light',
            autoClose: 700,
          });
          return;
        }

        if (isNaN(+discount) || +discount < 0) {
          toast.error('Nieprawidłowy upust', {
            position: 'top-center',
            theme: 'light',
            autoClose: 700,
          });
          return;
        }

        const result = ctx.saveItem({
          warehouseCode: item.code,
          groupId: item.groupId,
          itemId: item.id.toString(),
          productName: item.name,
          quantity: +quantity,
          unit: item.unit,
          unitPrice:
            item.prices[ctx.selectedPrice!].value * (1 - +discount / 100),
          taxRate: item.vatRate,
        });

        let resultLocalized: string;

        switch (result) {
          case 'add':
            resultLocalized = 'Dodano';
            break;
          case 'edit':
            resultLocalized = 'Edytowano';
            break;
        }

        toast.info(`${resultLocalized} produkt: ${item.name}`, {
          position: 'top-center',
          theme: 'light',
          autoClose: 700,
        });

        setSearchTerm('');
        searchBarRef.current?.focus();
      }
    },
    [ctx, quantities, discounts],
  );

  const selectRow = useCallback(
    (rowIndex: number, reset: boolean = false) => {
      if (rowsRef.current) {
        const selectedRow = rowsRef.current[filteredList[rowIndex].item.id];

        if (reset) {
          selectedRow.quantity?.focus();
          selectedRow.quantity?.select();
        } else {
          switch (document.activeElement) {
            case selectedRow.quantity:
              selectedRow.discount?.focus();
              selectedRow.discount?.select();
              break;

            default:
              selectedRow.quantity?.focus();
              selectedRow.quantity?.select();
              break;
          }
        }
      }
    },
    [filteredList],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();

          {
            const newSelectedItem = Math.max(0, selectedItem - 1);
            selectRow(newSelectedItem, true);
            setSelectedItem(newSelectedItem);
          }

          break;
        case 'ArrowDown':
          e.preventDefault();

          {
            const newSelectedItem = Math.min(
              filteredList.length - 1,
              selectedItem + 1,
            );
            selectRow(newSelectedItem, true);
            setSelectedItem(newSelectedItem);
          }

          break;
        case 'Enter':
          if (selectedItem >= 0 && selectedItem < filteredList.length) {
            selectItem(filteredList[selectedItem].item);
          }
          break;
        case 'Escape':
          if (ctx) {
            ctx.setCurrentView(OrderView.Summary);
          }
          break;
        case 'Tab':
          e.preventDefault();
          selectRow(selectedItem);

          break;
        default:
          break;
      }
    },
    [ctx, selectedItem, selectItem, filteredList, selectRow],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    if (sortedItemsWarehouses) {
      rowsRef.current = sortedItemsWarehouses.reduce(
        (acc: RowsElements, item) => {
          acc[item.id] = {
            quantity: null,
            discount: null,
          };

          return acc;
        },
        {},
      );
    }
  }, [sortedItemsWarehouses]);

  useEffect(() => {
    searchBarRef.current?.focus();
  }, [sortedItemsWarehouses]);

  return ctx && warehouses && sortedItemsWarehouses ? (
    <div>
      <h1 className='mb-5'>Wybór towaru</h1>

      <div className='justify-center flex items-center gap-2 mb-10'>
        <button
          className='confirm'
          onClick={() => ctx.setCurrentView(OrderView.Summary)}
        >
          Powrót do oferty (ESC)
        </button>
      </div>

      <div className='text-[20px] justify-center flex items-center gap-4 mb-10'>
        <p>Zmień zaznaczoną pozycję (↑/↓)</p>
        <p>Potwierdź pozycję (ENTER)</p>
      </div>

      <input
        ref={searchBarRef}
        type='text'
        placeholder='Wyszukaj towar...'
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className='searchbar w-full'
      />
      <table>
        <thead>
          <tr>
            <th>Nazwa</th>
            {warehouses.map((warehouse) => (
              <Fragment key={warehouse.id}>
                <th>Stan</th>
                <th>Ilość w trakcie ofertowania</th>
              </Fragment>
            ))}
            <th>Ilość</th>
            <th>Jedn. miary</th>
            <th>Rodzaj ceny</th>
            <th>Upust (%)</th>
            <th>Cena jedn.</th>
            <th>Wartość</th>
          </tr>
        </thead>
        <tbody>
          {filteredList.map(({ item, highlightRanges }, idx) => {
            const buyPrice = item.prices['zakupu'];
            const selectedPrice = item.prices[ctx.selectedPrice!];

            const quantity = quantities[item.id] ?? '0';
            const discount = discounts[item.id] ?? 0;

            // Calculate max discount based on buy price
            let maxDiscountBuyPrice: number;
            if (
              buyPrice.value === 0 ||
              selectedPrice.value === 0 ||
              buyPrice.value >= selectedPrice.value
            ) {
              maxDiscountBuyPrice = 0;
            } else {
              maxDiscountBuyPrice = Math.min(
                (1 - buyPrice.value / selectedPrice.value) * 100,
                100,
              );
            }

            // Final max discount is limited by both the buy price
            // and the discount set on Bitrix
            const maxDiscount = Math.min(
              ctx.maxDiscount ?? 0,
              maxDiscountBuyPrice,
            );

            const discountMultiplier = 1 - +discount / 100;
            const unitPrice = selectedPrice.value * discountMultiplier;
            const price = unitPrice * +quantity;

            return (
              <tr
                key={item.id}
                className={clsx(selectedItem === idx ? 'bg-gray-300' : '')}
                onMouseEnter={() => setSelectedItem(idx)}
              >
                <td>
                  <Highlight text={item.name} ranges={highlightRanges} />
                </td>
                {Object.values(item.quantities).map((quantity) => (
                  <Fragment key={quantity.warehouseId}>
                    <td>{quantity.quantity}</td>
                    <td>{quantity.reservation}</td>
                  </Fragment>
                ))}
                <td>
                  <input
                    ref={(el) => {
                      if (rowsRef.current) {
                        rowsRef.current[item.id!].quantity = el;
                      }
                    }}
                    className='w-[100px]'
                    type='number'
                    min={0}
                    value={quantity}
                    onChange={(e) =>
                      setQuantities((prev) =>
                        update(prev, { [item.id]: { $set: e.target.value } }),
                      )
                    }
                  />
                </td>
                <td>{item.unit}</td>
                <td>
                  <p>{ctx.selectedPrice}</p>
                </td>
                <td>
                  <input
                    ref={(el) => {
                      if (rowsRef.current) {
                        rowsRef.current[item.id!].discount = el;
                      }
                    }}
                    className='w-[100px]'
                    type='number'
                    min={0}
                    max={maxDiscount}
                    value={discount}
                    onChange={(e) =>
                      setDiscounts((prev) =>
                        update(prev, {
                          [item.id]: {
                            $set:
                              e.target.value === ''
                                ? ''
                                : Math.min(
                                    Math.max(0, +e.target.value),
                                    Math.floor(maxDiscount),
                                  ).toString(),
                          },
                        }),
                      )
                    }
                  />
                </td>
                <td>{unitPrice.toFixed(2)}</td>
                <td>{price.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  ) : (
    <div>
      {!warehouses ? (
        <h1>Ładowanie magazynów...</h1>
      ) : (
        <h1>Ładowanie przedmiotów...</h1>
      )}
    </div>
  );
}
