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
  useAddEditItem,
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
import { useQueryClient } from '@tanstack/react-query';

type Match = {
  item: ItemWarehouses;
  highlightRanges: HighlightRanges | null;
};

type RowElements = {
  name: HTMLInputElement | null;
  unit: HTMLInputElement | null;
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
  const { token, sqlToken } = useContext(AuthContext);
  const ctx = useContext(OrderContext);

  const queryClient = useQueryClient();

  const addEditItemMutation = useAddEditItem(token, sqlToken);
  const warehousesQuery = useGetWarehouses(token);
  const itemsQuery = useGetItems(token, sqlToken);
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
  const [editingItem, setEditingItem] = useState(-1);

  const [editedItem, setEditedItem] = useState<ItemWarehouses>();
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
    async (item: ItemWarehouses, editItem?: ItemWarehouses) => {
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

        let finalItem = item;

        if (editItem) {
          const newItem = await addEditItemMutation.mutateAsync(editItem);
          finalItem = { ...finalItem, ...newItem };

          void queryClient.invalidateQueries({ queryKey: ['items'] });
        }

        const result = ctx.saveItem({
          code: finalItem.code,
          groups: finalItem.groups,
          itemId: finalItem.id.toString(),
          productName: finalItem.name,
          quantity: +quantity,
          unit: finalItem.unit,
          unitPrice: finalItem.prices[ctx.selectedPrice!].value,
          discountRate: +discount,
          taxRate: finalItem.vatRate,
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

        toast.info(`${resultLocalized} produkt: ${finalItem.name}`, {
          position: 'top-center',
          theme: 'light',
          autoClose: 700,
        });

        setSearchTerm('');
        searchBarRef.current?.focus();
      }
    },
    [ctx, quantities, discounts, queryClient, addEditItemMutation],
  );

  const selectRow = useCallback(
    (rowIndex: number, reset: boolean = false) => {
      if (rowsRef.current) {
        const selectedRow = rowsRef.current[filteredList[rowIndex].item.id];
        const isEditing =
          selectedRow.name !== null && selectedRow.unit !== null;

        if (reset) {
          selectedRow.quantity?.focus();
          selectedRow.quantity?.select();
        } else {
          switch (document.activeElement) {
            case selectedRow.name:
              if (isEditing) {
                selectedRow.quantity?.focus();
                selectedRow.quantity?.select();
              }
              break;

            case selectedRow.quantity:
              if (isEditing) {
                selectedRow.unit?.focus();
                selectedRow.unit?.select();
              } else {
                selectedRow.discount?.focus();
                selectedRow.discount?.select();
              }
              break;

            case selectedRow.unit:
              if (isEditing) {
                selectedRow.discount?.focus();
                selectedRow.discount?.select();
              }
              break;

            case selectedRow.discount:
              if (isEditing) {
                selectedRow.name?.focus();
                selectedRow.name?.select();
              } else {
                selectedRow.quantity?.focus();
                selectedRow.quantity?.select();
              }
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
          setEditingItem(-1);

          {
            const newSelectedItem = Math.max(0, selectedItem - 1);
            selectRow(newSelectedItem, true);
            setSelectedItem(newSelectedItem);
          }

          break;
        case 'ArrowDown':
          e.preventDefault();
          setEditingItem(-1);

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
            selectItem(
              filteredList[selectedItem].item,
              editingItem !== -1 ? editedItem : undefined,
            ).then(() => {
              setEditingItem(-1);
              setEditedItem(undefined);
            });
          }
          break;
        case '1':
          if (e.altKey) {
            setEditedItem(filteredList[selectedItem].item);
            setEditingItem(selectedItem);
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
    [
      ctx,
      selectedItem,
      selectItem,
      filteredList,
      selectRow,
      editingItem,
      editedItem,
    ],
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
            name: null,
            unit: null,
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
        <p>Edytuj pozycję (Alt+1)</p>
      </div>

      <input
        ref={searchBarRef}
        type='text'
        placeholder='Wyszukaj towar...'
        value={searchTerm}
        onChange={(e) => {
          setEditingItem(-1);
          setSearchTerm(e.target.value);
        }}
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

            const isSelected = idx === selectedItem;
            const isEditing = idx === editingItem;

            const bgClassName = clsx({
              'bg-red-300': isEditing,
              'bg-gray-300': isSelected && !isEditing,
            });

            return (
              <tr
                key={item.id}
                className={bgClassName}
                onClick={() => setSelectedItem(idx)}
              >
                <td>
                  {isEditing ? (
                    <input
                      ref={(el) => {
                        if (rowsRef.current?.[item.id!]) {
                          rowsRef.current[item.id!].name = el;
                        }
                      }}
                      className='w-full text-center'
                      type='text'
                      value={editedItem?.name}
                      onChange={(e) => {
                        setEditedItem((prev) =>
                          update(prev, { name: { $set: e.target.value } }),
                        );
                      }}
                    />
                  ) : (
                    <Highlight text={item.name} ranges={highlightRanges} />
                  )}
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
                      if (rowsRef.current?.[item.id!]) {
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
                <td>
                  {isEditing ? (
                    <input
                      ref={(el) => {
                        if (rowsRef.current?.[item.id!]) {
                          rowsRef.current[item.id!].unit = el;
                        }
                      }}
                      type='text'
                      className='w-full text-center'
                      value={editedItem?.unit}
                      onChange={(e) =>
                        setEditedItem((prev) =>
                          update(prev, { unit: { $set: e.target.value } }),
                        )
                      }
                    />
                  ) : (
                    item.unit
                  )}
                </td>
                <td>
                  <p>{ctx.selectedPrice}</p>
                </td>
                <td>
                  <input
                    ref={(el) => {
                      if (rowsRef.current?.[item.id!]) {
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
