import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AuthContext } from "../../../api/comarch/auth.ts";
import { useGetWarehouses } from "../../../api/comarch/warehouse.ts";
import {
  ItemWarehouses,
  useGetItems,
  useGetItemsWarehouses,
} from "../../../api/comarch/item.ts";
import { OrderContext, OrderView } from "../../../models/order.ts";
import { useFuzzySearchList, Highlight } from "@nozbe/microfuzz/react";
import clsx from "clsx";
import { HighlightRanges } from "@nozbe/microfuzz";

type Match = {
  item: ItemWarehouses;
  highlightRanges: HighlightRanges | null;
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

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState(0);

  const searchBarRef = useRef<HTMLInputElement>(null);

  const filteredList = useFuzzySearchList<ItemWarehouses, Match>({
    list: itemsWarehouses ?? [],
    queryText: searchTerm,
    key: "name",
    mapResultItem: ({ item, matches: [highlightRanges] }) => ({
      item,
      highlightRanges,
    }),
  });

  const selectItem = useCallback(
    (item: ItemWarehouses) => {
      if (ctx) {
        ctx.setCurrentItem(item);
        ctx.setCurrentView(OrderView.Item);
      }
    },
    [ctx],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
          setSelectedItem(Math.max(0, selectedItem - 1));
          break;
        case "ArrowDown":
          setSelectedItem(Math.min(filteredList.length - 1, selectedItem + 1));
          break;
        case "Enter":
          if (selectedItem >= 0 && selectedItem < filteredList.length) {
            selectItem(filteredList[selectedItem].item);
          }
          break;
        case "Insert":
          searchBarRef.current?.focus();
          break;
        case "Escape":
          if (ctx) {
            ctx.setCurrentView(OrderView.Summary);
          }
          break;
        default:
          break;
      }
    },
    [ctx, selectedItem, selectItem, filteredList, searchBarRef],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return ctx && warehouses && itemsWarehouses ? (
    <div>
      <h1 className="mb-5">Wybór towaru</h1>

      <div className="justify-center flex items-center gap-2 mb-10">
        <button onClick={() => ctx.setCurrentView(OrderView.Summary)}>
          Anuluj (ESC)
        </button>
      </div>

      <div className="text-[20px] justify-center flex items-center gap-4 mb-10">
        <p>Zmień zaznaczoną pozycję (↑/↓)</p>
        <p>Wybierz pozycję (ENTER)</p>
        <p>Przejdź do wyszukiwarki (INSERT)</p>
      </div>

      <input
        ref={searchBarRef}
        type="text"
        placeholder="Wyszukaj towar..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="searchbar w-full"
      />
      <table>
        <thead>
          <tr>
            <th>Nazwa</th>
            {warehouses.map((warehouse) => (
              <th key={warehouse.id}>Stan ({warehouse.name})</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredList.map(({ item, highlightRanges }, idx) => (
            <tr
              key={item.id}
              onClick={() => selectItem(item)}
              className={clsx(
                selectedItem === idx ? "bg-gray-300" : "",
                "cursor-pointer",
              )}
              onMouseEnter={() => setSelectedItem(idx)}
            >
              <td>
                <Highlight text={item.name} ranges={highlightRanges} />
              </td>
              {Object.values(item.quantities).map((quantity) => (
                <td key={quantity.warehouseId}>{quantity.quantity}</td>
              ))}
            </tr>
          ))}
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
