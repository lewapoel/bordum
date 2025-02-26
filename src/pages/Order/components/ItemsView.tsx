import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../../api/auth.ts";
import { getWarehouses, Warehouse } from "../../../api/warehouse.ts";
import { getItemsWarehouses, ItemWarehouses } from "../../../api/item.ts";
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
  const [warehouses, setWarehouses] = useState<Array<Warehouse>>();
  const [itemsWarehouses, setItemsWarehouses] =
    useState<Array<ItemWarehouses>>();

  const [searchTerm, setSearchTerm] = useState("");

  const filteredList = useFuzzySearchList<ItemWarehouses, Match>({
    list: itemsWarehouses ?? [],
    queryText: searchTerm,
    key: "name",
    mapResultItem: ({ item, matches: [highlightRanges] }) => ({
      item,
      highlightRanges,
    }),
  });

  useEffect(() => {
    if (token) {
      getWarehouses(token).then((warehousesData) => {
        if (warehousesData) {
          setWarehouses(warehousesData);
        }
      });

      getItemsWarehouses(token).then((itemsWarehousesData) => {
        if (itemsWarehousesData) {
          setItemsWarehouses(Object.values(itemsWarehousesData));
        }
      });
    }
  }, [token]);

  const [selectedItem, setSelectedItem] = useState(0);

  return ctx && warehouses && itemsWarehouses ? (
    <div>
      <h1 className="mb-5">Wybór towaru</h1>
      <input
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
          {filteredList.map(({ item, highlightRanges }) => (
            <tr
              key={item.id}
              onClick={() => {
                ctx?.setCurrentItem(item);
                ctx.setCurrentView(OrderView.Item);
              }}
              className={clsx(
                selectedItem === item.id ? "bg-blue-500" : "",
                "cursor-pointer",
              )}
              onMouseEnter={() => setSelectedItem(item.id)}
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
      <div className="justify-center flex items-center gap-2 mt-10">
        <button onClick={() => ctx.setCurrentView(OrderView.Summary)}>
          Anuluj
        </button>
      </div>
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
