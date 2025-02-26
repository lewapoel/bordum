// src/api/stock.js

import { API_URL } from "./const";

export type Stock = {
  itemId: number;
  quantity: number;
  warehouseId: number;
};

export type Stocks = { [key: number]: Stock };

export async function getStocks(
  warehouseId: any,
  token: any,
): Promise<Stocks | null> {
  const params = new URLSearchParams({
    warehouseId,
  });

  const response = await fetch(`${API_URL}/Stocks?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    alert("Nie udało się pobrać zasobów");
    return null;
  }

  const data = await response.json();

  return Object.entries(data).reduce((result: any, [itemId, stocks]: any) => {
    result[+itemId] = {
      itemId: +itemId,
      quantity: stocks[0]["quantity"],
      warehouseId: warehouseId,
    };

    return result;
  }, {});
}
