// src/api/stock.js

import { API_URL } from "./const";

export async function getStocks(warehouseId, token) {
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

  return Object.entries(data).reduce((result, [itemId, stocks]) => {
    result[itemId] = {
      itemId: itemId,
      quantity: stocks[0]["quantity"],
    };

    return result;
  }, {});
}
