import { API_URL } from './const.ts';
import { Stock, Stocks, getStocks } from './stock.ts';
import { Warehouse } from './warehouse.ts';
import { useQuery } from '@tanstack/react-query';

export type Price = {
  value: number;
  currency: string;
};

export type Prices = { [key: string]: Price };

export type Item = {
  id: number;
  code: string;
  name: string;
  unit: string;
  prices: Prices;
  groupId: string;
  vatRate: number;
};

export type ItemsGroup = {
  id: number;
  gidNumber: number;
  parentGidNumber: number;
  parent?: ItemsGroup;
  code: string;
  name: string;
};

// Keyed by `code`
export type ItemsGroups = { [key: string]: ItemsGroup };

// Keyed by `gidNumber`
type ItemsGroupsGid = { [key: string]: ItemsGroup };

export function useGetItemsGroups(token: string) {
  return useQuery({
    // eslint-disable-next-line
    queryKey: ['items/groups'],
    queryFn: () =>
      fetch(`${API_URL}/ItemsGroups?limit=999999999`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (response): Promise<ItemsGroups> => {
          const data = await response.json();

          const groups: Array<ItemsGroup> = data.map(
            (item: any): ItemsGroup => ({
              id: item['id'],
              gidNumber: item['gidNumber'],
              parentGidNumber: item['parentGidNumber'],
              code: item['code'],
              name: item['name'],
            }),
          );

          const groupsByGid = groups.reduce(
            (acc: ItemsGroupsGid, item: ItemsGroup) => {
              acc[item.gidNumber] = item;
              return acc;
            },
            {},
          );

          return groups.reduce((acc: ItemsGroups, item: ItemsGroup) => {
            if (item.parentGidNumber !== 0 && item.parentGidNumber !== -1) {
              item.parent = groupsByGid[item.parentGidNumber];
            }

            acc[item.code] = item;
            return acc;
          }, {});
        })
        .catch((error) => {
          console.error(error);
          alert('Nie udało się pobrać grup przedmiotów');
          return null;
        }),
    enabled: !!token,
  });
}

export function useGetItems(token: string) {
  return useQuery({
    // eslint-disable-next-line
    queryKey: ['items'],
    queryFn: () =>
      fetch(`${API_URL}/Items?limit=999999999`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (response): Promise<Array<Item>> => {
          const data = await response.json();

          return data.map(
            (item: any): Item => ({
              id: item['id'],
              code: item['code'],
              name: item['name'],
              unit: item['unit'],
              groupId: item['defaultGroup'],
              vatRate: item['vatRate'],
              prices: item['prices'].reduce((prices: any, price: any) => {
                prices[price['name']] = {
                  value: price['value'],
                  currency: price['currency'],
                };

                return prices;
              }, {}),
            }),
          );
        })
        .catch((error) => {
          console.error(error);
          alert('Nie udało się pobrać przedmiotów');
          return null;
        }),
    enabled: !!token,
  });
}

export type WarehouseItem = Item & {
  quantity: number;
};

export async function getWarehouseItems(
  items: Array<Item>,
  stocks: Stocks,
): Promise<Array<WarehouseItem> | null> {
  if (!items || !stocks) {
    return null;
  }

  return items
    .map((item: any) => ({
      ...item,
      quantity: stocks[item.id.toString()].quantity,
    }))
    .filter((item: any) => item.quantity > 0);
}

export type Quantities = { [warehouseId: number]: Stock };

export type ItemWarehouses = Item & {
  quantities: Quantities;
};

export type ItemsWarehouses = { [itemId: number]: ItemWarehouses };

export function useGetItemsWarehouses(
  token: string,
  items?: Array<Item> | null,
  warehouses?: Array<Warehouse> | null,
) {
  return useQuery({
    // eslint-disable-next-line
    queryKey: ['itemsWarehouses', items?.length, warehouses?.length],
    queryFn: async () => {
      if (!items || !warehouses) {
        return null;
      }

      const results: ItemsWarehouses = items.reduce(
        (acc: ItemsWarehouses, item: Item) => {
          acc[item.id] = { ...item, quantities: {} };
          return acc;
        },
        {},
      );

      for (const warehouse of warehouses) {
        const stocks = await getStocks(token, warehouse.id);
        if (!stocks) {
          return null;
        }

        for (const stock of Object.values(stocks)) {
          results[stock.itemId].quantities[stock.warehouseId] = stock;
        }
      }

      return results;
    },
    enabled: !!token && !!items && !!warehouses,
  });
}
