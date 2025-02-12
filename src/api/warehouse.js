// src/api/warehouse.js

import { API_URL } from "./const";

export async function getWarehouses(token) {
  const response = await fetch(`${API_URL}/Warehouses`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    alert("Nie udało się pobrać magazynów");
    return null;
  }

  const data = await response.json();

  return data.map((warehouse) => ({
    id: warehouse["id"],
    name: warehouse["name"],
  }));
}
