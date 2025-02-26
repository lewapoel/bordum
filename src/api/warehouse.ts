// src/api/warehouse.js

import { API_URL } from "./const";

export type Warehouse = {
  id: number;
  name: string;
}

export async function getWarehouses(token: string): Promise<Array<Warehouse> | null> {
  const response = await fetch(`${API_URL}/Warehouses`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    alert("Nie udało się pobrać magazynów");
    return null;
  }

  const data = await response.json();

  return data.map((warehouse: any) => ({
    id: warehouse["id"],
    name: warehouse["name"],
  }));
}
