import { API_URL } from './const.ts';
import { getStocks, Stock } from './stock.ts';
import { Warehouse } from './warehouse.ts';
import { useMutation, useQuery } from '@tanstack/react-query';
import { convertItemPrices, generateItemCode } from '@/utils/item.ts';
import { DEFAULT_PRICE, Prices, PriceType } from '@/data/comarch/prices.ts';
import {
  getProductGroups,
  GroupsCodes,
  ProductGroups,
  setProductGroups,
  setProductPrice,
} from '@/api/comarch-sql/product.ts';

export type Item = {
  id: number;
  code: string;
  name: string;
  unit: string;
  prices: Prices;
  groups: GroupsCodes;
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

function parseItem(productGroups: ProductGroups, item: any): Item {
  return convertItemPrices(
    {
      id: item['id'],
      code: item['code'],
      name: item['name'],
      unit: item['unit'],
      groups: productGroups[item['code']],
      vatRate: item['vatRate'],
      prices: item['prices'].reduce((prices: Prices, price: any) => {
        prices[price['name']] = {
          number: price['number'],
          value: price['value'],
          currency: price['currency'],
          type: price['type'],
        };

        return prices;
      }, {}),
    },
    PriceType.BRUTTO,
  );
}

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

export function useGetItems(token: string, sqlToken: string) {
  return useQuery({
    // eslint-disable-next-line
    queryKey: ['items'],
    queryFn: async () => {
      const productGroups = await getProductGroups(sqlToken);
      if (!productGroups) {
        return null;
      }

      return fetch(`${API_URL}/Items?limit=999999999`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (response): Promise<Array<Item>> => {
          const data = await response.json();

          return data.map((item: any): Item => parseItem(productGroups, item));
        })
        .catch((error) => {
          console.error(error);
          alert('Nie udało się pobrać przedmiotów');
          return null;
        });
    },
    enabled: !!token,
  });
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
    queryKey: ['items-warehouses', items?.length, warehouses?.length],
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

async function fixAddedItem(
  sqlToken: string,
  item: Item,
  addedItem: any,
  defaultPriceValue: number,
): Promise<Item> {
  const groupsSet = await setProductGroups(
    sqlToken,
    addedItem['code'],
    item.groups,
  );
  if (!groupsSet) {
    throw new Error();
  }

  const priceSet = await setProductPrice(
    sqlToken,
    addedItem['code'],
    DEFAULT_PRICE,
    defaultPriceValue,
  );
  if (!priceSet) {
    throw new Error();
  }

  const productGroups = await getProductGroups(sqlToken);
  if (!productGroups) {
    throw new Error('Missing product groups');
  }

  return parseItem(productGroups, addedItem);
}

export function useAddEditItem(token: string, sqlToken: string) {
  return useMutation({
    mutationKey: ['add-edit-item'],
    mutationFn: async (item: Item) => {
      let response = await fetch(`${API_URL}/Items/${item.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const baseItem = await response.json();
      if (!response.ok || !baseItem) {
        throw new Error(await response.text());
      }

      baseItem.type = 0;
      baseItem.name = '(CUSTOM) ' + item.name;
      baseItem.unit = item.unit;
      baseItem.code = generateItemCode();
      baseItem.prices = Object.values(item.prices);

      response = await fetch(`${API_URL}/Items`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(baseItem),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const addedItem = await response.json();
      return await fixAddedItem(
        sqlToken,
        item,
        addedItem,
        baseItem['prices'][0]['value'],
      );
    },
    onError: (error) => {
      console.error(error);
      alert('Wystąpił błąd przy dodawaniu edycji przedmiotu. Sprawdź konsolę');
    },
  });
}

export function useAddItem(token: string, sqlToken: string) {
  return useMutation({
    mutationKey: ['add-item'],
    mutationFn: async (item: Item) => {
      const itemBody = {
        type: 0,
        code: item.code,
        name: item.name,
        vatRate: item.vatRate,
        vatRateFlag: 2,
        unit: item.unit,
        prices: Object.entries(item.prices).map(([priceName, price]) => ({
          number: price.number,
          type: price.type,
          name: priceName,
          value: price.value,
          currency: price.currency,
        })),
        product: 0,
      };

      const response = await fetch(`${API_URL}/Items`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemBody),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const addedItem = await response.json();
      return await fixAddedItem(
        sqlToken,
        item,
        addedItem,
        item.prices[DEFAULT_PRICE].value,
      );
    },
    onError: (error) => {
      console.error(error);
      alert('Wystąpił błąd przy dodawaniu przedmiotu. Sprawdź konsolę');
    },
  });
}
