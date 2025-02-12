// src/api/item.js

import { API_URL } from "./const";
import { getStocks } from "./stock";

export async function getItems(token) {
  const response = await fetch(`${API_URL}/Items`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    alert("Nie udało się pobrać przedmiotów");
    return null;
  }

  const data = await response.json();

  return data.map((item) => ({
    id: item["id"],
    name: item["name"],
    unit: item["unit"],
    prices: item["prices"].reduce((prices, price) => {
      prices[price["name"]] = {
        value: price["value"],
        currency: price["currency"],
      };

      return prices;
    }, {}),
  }));
}

export async function getWarehouseItems(warehouseId, token) {
  const items = await getItems(token);
  const stocks = await getStocks(warehouseId, token);

  if (items.length === 0 || stocks.length === 0) {
    return [];
  }

  return items
    .map((item) => ({
      ...item,
      quantity: stocks[item.id.toString()].quantity,
    }))
    .filter((item) => item.quantity > 0);
}
