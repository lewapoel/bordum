// src/api/stock.js

import { API_URL } from "./const";
import { useQuery } from "@tanstack/react-query";

export type Stock = {
  itemId: number;
  quantity: number;
  warehouseId: number;
};

export type Stocks = { [key: number]: Stock };

export async function getStocks(
  token: string,
  warehouseId: number,
): Promise<Stocks | null> {
  const params = new URLSearchParams({
    warehouseId: warehouseId.toString(),
  });

  return fetch(`${API_URL}/Stocks?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(async (response) => {
      const data = await response.json();

      return Object.entries(data).reduce(
        (result: Stocks, [itemId, stocks]: [string, any]) => {
          result[+itemId] = {
            itemId: +itemId,
            quantity: stocks[0]["quantity"],
            warehouseId: warehouseId,
          };

          return result;
        },
        {},
      );
    })
    .catch((error) => {
      console.error(error);
      alert("Nie udało się pobrać zasobów");
      return null;
    });
}

export function useGetStocks(token: string, warehouseId?: number) {
  return useQuery({
    queryKey: ["stocks", warehouseId],
    queryFn: () => {
      if (warehouseId) {
        return getStocks(token, warehouseId);
      }
    },
    enabled: !!token && !!warehouseId,
  });
}
