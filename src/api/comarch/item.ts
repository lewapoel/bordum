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
};

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
