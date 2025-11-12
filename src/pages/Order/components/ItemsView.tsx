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
  ComarchItemType,
  Item,
  ItemWarehouses,
  useAddEditItem,
  useGetItems,
  useGetItemsGroups,
  useGetItemsWarehouses,
} from '@/api/comarch/item.ts';
import { OrderContext, OrderView } from '@/models/order.ts';
import { useFuzzySearchList } from '@nozbe/microfuzz/react';
import clsx from 'clsx';
import { toast } from 'react-toastify';
import { AuthContext } from '@/components/AuthContext.tsx';
import {
  calculateDiscountPrice,
  calculateMaxDiscount,
  useGetTemplateItems,
} from '@/utils/item.ts';
import {
  TEMPLATE_ITEM_GROUP,
  TEMPORARY_ITEM_GROUP,
} from '@/data/comarch/groups.ts';
import { ItemType } from '@/models/bitrix/order.ts';
import AddItemDialog from '@/pages/Order/components/dialog/AddItemDialog.tsx';
import AddTemplateItemDialog from '@/pages/Order/components/dialog/AddTemplateItemDialog.tsx';
import EditTemplateItems from '@/pages/Order/components/EditTemplateItems.tsx';
import ItemsRow, {
  Discounts,
  Match,
  Quantities,
  RowsElements,
} from '@/pages/Order/components/ItemsRow.tsx';

export default function ItemsView() {
  const { token, sqlToken } = useContext(AuthContext);
  const ctx = useContext(OrderContext);
  const currentTemplateItems = useGetTemplateItems();

  const addEditItemMutation = useAddEditItem(token, sqlToken);
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
            .filter(
              (item) =>
                !currentTemplateItems.includes(item.code) &&
                !item.groups.includes(TEMPORARY_ITEM_GROUP) &&
                !item.groups.includes(TEMPLATE_ITEM_GROUP),
            )
        : null,
    [itemsWarehouses, currentTemplateItems],
  );

  const [temporarySearch, setTemporarySearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(0);
  const [editingItem, setEditingItem] = useState(-1);
  const [addItemVisible, setAddItemVisible] = useState(false);
  const [addTemplateItemVisible, setAddTemplateItemVisible] = useState(false);
  const [editTemplateItemsVisible, setEditTemplateItemsVisible] =
    useState(false);

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

  const addEditItem = useCallback(
    async (
      editItem: Item,
      itemType: ComarchItemType = ComarchItemType.SERVICE,
    ) => {
      return await toast.promise(
        async () => {
          return await addEditItemMutation.mutateAsync({
            item: editItem,
            itemType,
          });
        },
        {
          pending: 'Dodawanie edytowanej pozycji...',
        },
        {
          position: 'top-center',
          theme: 'light',
        },
      );
    },
    [addEditItemMutation],
  );

  const selectItemManual = useCallback(
    async (item: Item, type: ItemType, quantity: number, discount?: number) => {
      if (ctx) {
        const result = ctx.saveItem({
          code: item.code,
          groups: item.groups,
          itemId: item.id.toString(),
          productName: item.name,
          type: type,
          quantity: +quantity,
          unit: item.unit,
          unitPrice: calculateDiscountPrice(
            item.prices[ctx.selectedPrice!].value,
            discount,
          ),
          discountRate: discount ?? 0,
          taxRate: item.vatRate,
          bruttoUnitPrice: item.prices[ctx.selectedPrice!].value,
          maxDiscount: calculateMaxDiscount(item, ctx.selectedPrice!),
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

        setTemporarySearch('');
        searchBarRef.current?.focus();
      }
    },
    [ctx],
  );

  const selectItem = useCallback(
    async (item: ItemWarehouses, editItem?: Item) => {
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

        let finalItem: Item = item;
        if (editItem) {
          finalItem = await addEditItem({
            ...editItem,
            groups: [TEMPORARY_ITEM_GROUP],
          });
        }

        await selectItemManual(
          finalItem,
          editItem ? ItemType.CUSTOM_ITEM : ItemType.STANDARD,
          +quantity,
          +discount,
        );
      }
    },
    [ctx, quantities, discounts, selectItemManual, addEditItem],
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
              break;
          }
        }
      }
    },
    [filteredList],
  );

  const addRow = useCallback(() => {
    if (ctx?.allowAddingProduct) setAddItemVisible(true);
  }, [ctx]);

  const addTemplateRow = useCallback(() => {
    setAddTemplateItemVisible(true);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        !addItemVisible &&
        !addTemplateItemVisible &&
        !editTemplateItemsVisible
      ) {
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
          case '3':
            if (e.altKey) {
              addTemplateRow();
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
          case '=':
            e.preventDefault();
            setSearchTerm(temporarySearch);

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
      addTemplateRow,
      addItemVisible,
      addTemplateItemVisible,
      temporarySearch,
      editTemplateItemsVisible,
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
      <AddItemDialog visible={addItemVisible} setVisible={setAddItemVisible} />
      <AddTemplateItemDialog
        visible={addTemplateItemVisible}
        setVisible={setAddTemplateItemVisible}
        addEditItem={addEditItem}
        selectItemManual={selectItemManual}
        itemsData={itemsQuery.data}
        setEditTemplateItemVisible={setEditTemplateItemsVisible}
      />

      {editTemplateItemsVisible ? (
        <EditTemplateItems
          items={itemsWarehouses}
          setVisible={setEditTemplateItemsVisible}
        />
      ) : (
        <>
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
              className={clsx(
                ctx.allowAddingProduct ? '' : 'disabled',
                'confirm',
              )}
              onClick={() => addRow()}
            >
              Dodaj niestandardową pozycję (Alt+2)
            </button>

            <button className='confirm' onClick={() => addTemplateRow()}>
              Niestandardowy wymiar (Alt+3)
            </button>
          </div>

          <div className='text-[20px] justify-center flex items-center gap-4 mb-10'>
            <p>Zmień zaznaczoną pozycję (↑/↓)</p>
            <p>Zmień pole (TAB)</p>
            <p>Potwierdź pozycję (ENTER)</p>
            <p>Edytuj pozycję (Alt+1)</p>
          </div>

          <div className='flex items-center gap-4'>
            <input
              ref={searchBarRef}
              type='text'
              placeholder='Wyszukaj towar...'
              value={temporarySearch}
              onChange={(e) => {
                setEditingItem(-1);
                setTemporarySearch(e.target.value);
              }}
              className='searchbar w-full'
            />

            <button
              className='confirm shrink-0'
              onClick={() => setSearchTerm(temporarySearch)}
            >
              Szukaj (=)
            </button>
          </div>
          <table>
            <thead className='bg-white freeze'>
              <tr>
                <th>Nazwa</th>
                {warehouses.map((warehouse) => (
                  <Fragment key={warehouse.id}>
                    <th>Stan</th>
                    <th>Rezerwacja</th>
                  </Fragment>
                ))}
                <th>Ilość</th>
                <th>Jedn. miary</th>
                <th>Upust (%)</th>
                <th>Cena jedn.</th>
                <th>Wartość</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((match, idx) => (
                <ItemsRow
                  key={idx}
                  match={match}
                  quantities={quantities}
                  discounts={discounts}
                  idx={idx}
                  selectedItem={selectedItem}
                  editingItem={editingItem}
                  setSelectedItem={setSelectedItem}
                  setEditingItem={setEditingItem}
                  rowsRef={rowsRef}
                  editedItem={editedItem}
                  setEditedItem={setEditedItem}
                  setQuantities={setQuantities}
                  setDiscounts={setDiscounts}
                />
              ))}
            </tbody>
          </table>
        </>
      )}
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
