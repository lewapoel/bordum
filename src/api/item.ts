// src/api/item.js

import { API_URL } from "./const";
import { getStocks, Stock } from "./stock";
import { getWarehouses } from "./warehouse.ts";

export type Price = {
  value: number;
  currency: string;
};

export type Prices = { [key: string]: Price };

export type Item = {
  id: number;
  name: string;
  unit: string;
  prices: Prices;
};

export async function getItems(token: string): Promise<Array<Item> | null> {
  const response = await fetch(`${API_URL}/Items`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    alert("Nie udało się pobrać przedmiotów");
    return null;
  }

  const data = await response.json();

  return data.map((item: any) => ({
    id: item["id"],
    name: item["name"],
    unit: item["unit"],
    prices: item["prices"].reduce((prices: any, price: any) => {
      prices[price["name"]] = {
        value: price["value"],
        currency: price["currency"],
      };

      return prices;
    }, {}),
  }));
}

export type WarehouseItem = Item & {
  quantity: number;
};

export async function getWarehouseItems(
  warehouseId: any,
  token: any,
): Promise<Array<WarehouseItem> | null> {
  const items = await getItems(token);
  const stocks = await getStocks(warehouseId, token);

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

export async function getItemsWarehouses(
  token: string,
): Promise<ItemsWarehouses | null> {
  const warehouses = await getWarehouses(token);
  const items = await getItems(token);

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
    const stocks = await getStocks(warehouse.id, token);
    if (!stocks) {
      return null;
    }

    for (const stock of Object.values(stocks)) {
      results[stock.itemId].quantities[stock.warehouseId] = stock;
    }
  }

  return results;
}
