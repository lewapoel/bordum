// src/api/warehouse.js

import { API_URL } from "./const";
import { useQuery } from "@tanstack/react-query";

export type Warehouse = {
  id: number;
  name: string;
};

export function useGetWarehouses(token: string) {
  return useQuery({
    queryKey: ["warehouses"],
    queryFn: () =>
      fetch(`${API_URL}/Warehouses`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (response): Promise<Array<Warehouse>> => {
          const data = await response.json();

          return data.map((warehouse: any) => ({
            id: warehouse["id"],
            name: warehouse["name"],
          }));
        })
        .catch((error) => {
          console.error(error);
          alert("Nie udało się pobrać magazynów");
          return null;
        }),
    enabled: !!token,
  });
}
