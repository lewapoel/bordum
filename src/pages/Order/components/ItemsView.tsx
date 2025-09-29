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
  useAddItem,
  useGetItems,
  useGetItemsGroups,
  useGetItemsWarehouses,
} from '@/api/comarch/item.ts';
import { OrderContext, OrderView } from '@/models/order.ts';
import { Highlight, useFuzzySearchList } from '@nozbe/microfuzz/react';
import clsx from 'clsx';
import { HighlightRanges } from '@nozbe/microfuzz';
import update from 'immutability-helper';
import { toast } from 'react-toastify';
import { AuthContext } from '@/components/AuthContext.tsx';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form.tsx';
import { generateItemCode } from '@/utils/item.ts';
import { PriceType } from '@/data/comarch/prices.ts';
import { TEMPORARY_ITEM_GROUP } from '@/data/comarch/groups.ts';

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

const priceSchema = z
  .string()
  .min(1, 'Cena jest wymagana')
  .refine((val) => !isNaN(parseFloat(val)), { message: 'Cena musi być liczbą' })
  .refine((val) => parseFloat(val) >= 0, {
    message: 'Cena nie może być ujemna',
  })
  .refine((val) => Number.isInteger(parseFloat(val) * 100), {
    message: 'Cena nie może mieć więcej niż 2 miejsca po przecinku',
  });

const addItemFormSchema = z.object({
  name: z.string().min(1, 'Nazwa pozycji jest wymagana'),
  unit: z.string().min(1, 'Jednostka pozycji jest wymagana'),
  prices: z.object({
    retail: priceSchema,
  }),
  quantity: z
    .string()
    .min(1, 'Ilość jest wymagana')
    .refine((val) => !isNaN(parseFloat(val)), {
      message: 'Ilość musi być liczbą',
    })
    .refine((val) => parseFloat(val) > 0, {
      message: 'Ilość musi być większa od zera',
    }),
});

export default function ItemsView() {
  const { token, sqlToken } = useContext(AuthContext);
  const ctx = useContext(OrderContext);

  const addEditItemMutation = useAddEditItem(token, sqlToken);
  const addItemMutation = useAddItem(token, sqlToken);
  const warehousesQuery = useGetWarehouses(token);
  const itemsQuery = useGetItems(token, sqlToken);
  const itemsWarehousesQuery = useGetItemsWarehouses(
    token,
    itemsQuery.data,
    warehousesQuery.data,
  );
  const itemsGroupsQuery = useGetItemsGroups(token);

  const warehouses = warehousesQuery.data;
  const itemsWarehouses = useMemo(
    () =>
      itemsWarehousesQuery.data
        ? Object.values(itemsWarehousesQuery.data)
        : null,
    [itemsWarehousesQuery.data],
  );
  const itemsGroups = itemsGroupsQuery.data;

  const processedItemsWarehouses = useMemo(
    () =>
      itemsWarehouses
        ? itemsWarehouses
            .toSorted(
              (a, b) =>
                Math.max(
                  ...Object.values(b.quantities).map((x) => x.quantity),
                ) -
                Math.max(...Object.values(a.quantities).map((x) => x.quantity)),
            )
            .filter((item) => !item.groups.includes(TEMPORARY_ITEM_GROUP))
        : null,
    [itemsWarehouses],
  );

  const addItemForm = useForm<z.infer<typeof addItemFormSchema>>({
    resolver: zodResolver(addItemFormSchema),
    defaultValues: {
      name: '',
      unit: 'szt.',
      prices: {
        retail: '0',
      },
      quantity: '1',
    },
    mode: 'onChange',
  });

  const onAddItemSubmit = useCallback(
    async (values: z.infer<typeof addItemFormSchema>) => {
      if (ctx) {
        await toast.promise(
          async () => {
            const newItem = await addItemMutation.mutateAsync({
              id: 0,
              unit: values.unit,
              name: values.name,
              groups: [TEMPORARY_ITEM_GROUP],
              code: generateItemCode(),
              vatRate: 23.0,
              prices: {
                zakupu: {
                  number: 1,
                  type: PriceType.NETTO,
                  value: 0,
                  currency: 'PLN',
                },
                'hurtowa 1': {
                  number: 2,
                  type: PriceType.NETTO,
                  value: 0,
                  currency: 'PLN',
                },
                'hurtowa 2': {
                  number: 3,
                  type: PriceType.NETTO,
                  value: 0,
                  currency: 'PLN',
                },
                'hurtowa 3': {
                  number: 4,
                  type: PriceType.NETTO,
                  value: 0,
                  currency: 'PLN',
                },
                detaliczna: {
                  number: 5,
                  type: PriceType.BRUTTO,
                  value: +values.prices.retail,
                  currency: 'PLN',
                },
              },
            });

            if (newItem) {
              ctx.saveItem({
                code: newItem.code,
                groups: newItem.groups,
                itemId: newItem.id.toString(),
                productName: newItem.name,
                quantity: +values.quantity,
                unit: newItem.unit,
                unitPrice: newItem.prices['detaliczna'].value,
                discountRate: 0,
                taxRate: newItem.vatRate,
              });

              toast.info(`Dodano nową pozycję: ${newItem.name}`, {
                position: 'top-center',
                theme: 'light',
                autoClose: 2000,
              });

              setAddingItemVisible(false);
            }
          },
          {
            pending: 'Dodawanie nowej pozycji...',
          },
          {
            position: 'top-center',
            theme: 'light',
          },
        );
      }
    },
    [ctx, addItemMutation],
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(0);
  const [editingItem, setEditingItem] = useState(-1);
  const [addingItemVisible, setAddingItemVisible] = useState(false);

  const [editedItem, setEditedItem] = useState<ItemWarehouses>();
  const [quantities, setQuantities] = useState<Quantities>({});
  const [discounts, setDiscounts] = useState<Discounts>({});

  const searchBarRef = useRef<HTMLInputElement>(null);
  const rowsRef = useRef<RowsElements>(null);

  const filteredList = useFuzzySearchList<ItemWarehouses, Match>({
    list: processedItemsWarehouses ?? [],
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
          await toast.promise(
            async () => {
              const newItem = await addEditItemMutation.mutateAsync({
                ...editItem,
                groups: [TEMPORARY_ITEM_GROUP],
              });

              finalItem = { ...finalItem, ...newItem };
            },
            {
              pending: 'Dodawanie edytowanej pozycji...',
            },
            {
              position: 'top-center',
              theme: 'light',
            },
          );
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
    [ctx, quantities, discounts, addEditItemMutation],
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

            default:
              if (isEditing) {
                selectedRow.name?.focus();
                selectedRow.name?.select();
              } else {
                selectedRow.quantity?.focus();
                selectedRow.quantity?.select();
              }
          }
        }
      }
    },
    [filteredList],
  );

  const addRow = useCallback(() => {
    if (ctx?.allowAddingProduct) setAddingItemVisible(true);
  }, [ctx]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!addingItemVisible) {
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
          case '2':
            if (e.altKey) {
              addRow();
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
      addRow,
      addingItemVisible,
    ],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    if (processedItemsWarehouses) {
      rowsRef.current = processedItemsWarehouses.reduce(
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
  }, [processedItemsWarehouses]);

  useEffect(() => {
    searchBarRef.current?.focus();
  }, [processedItemsWarehouses]);

  return ctx && warehouses && processedItemsWarehouses && itemsGroups ? (
    <div>
      <Dialog open={addingItemVisible} onOpenChange={setAddingItemVisible}>
        <DialogContent
          showCloseButton={false}
          className='lg:max-w-screen-lg overflow-y-auto max-h-screen'
        >
          <Form {...addItemForm}>
            <form
              className='flex flex-col gap-4'
              onSubmit={addItemForm.handleSubmit(onAddItemSubmit)}
            >
              <DialogHeader>
                <DialogTitle>Dodaj niestandardową pozycję</DialogTitle>
                <DialogDescription>Uzupełnij dane pozycji</DialogDescription>
              </DialogHeader>

              <div className='flex flex-col gap-4'>
                <FormField
                  control={addItemForm.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nazwa</FormLabel>
                      <FormControl>
                        <Input
                          type='text'
                          placeholder='Wprowadź nazwę pozycji...'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addItemForm.control}
                  name='unit'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jednostka</FormLabel>
                      <FormControl>
                        <Input
                          type='text'
                          placeholder='Wprowadź nazwę jednostki...'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addItemForm.control}
                  name='prices.retail'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cena detaliczna (brutto)</FormLabel>
                      <FormControl>
                        <Input type='number' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addItemForm.control}
                  name='quantity'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ilość</FormLabel>
                      <FormControl>
                        <Input type='number' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  disabled={
                    !addItemForm.formState.isValid ||
                    !addItemForm.formState.isDirty ||
                    addItemForm.formState.isSubmitting
                  }
                  type='submit'
                  className='confirm'
                >
                  Zapisz
                </Button>
                <DialogClose asChild>
                  <Button className='delete'>Anuluj</Button>
                </DialogClose>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <h1 className='mb-5'>Wybór towaru</h1>

      <div className='justify-center flex items-center gap-2 mb-10'>
        <button
          className='confirm'
          onClick={() => ctx.setCurrentView(OrderView.Summary)}
        >
          Powrót do oferty (ESC)
        </button>

        <button
          disabled={!ctx.allowAddingProduct}
          className={clsx(ctx.allowAddingProduct ? '' : 'disabled', 'confirm')}
          onClick={() => addRow()}
        >
          Dodaj niestandardową pozycję (Alt+2)
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
                      className='w-[100px] text-center'
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
