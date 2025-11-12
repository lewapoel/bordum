import { API_URL } from './const.ts';
import { useQuery } from '@tanstack/react-query';

export type Warehouse = {
  id: number;
  name: string;
};

export function useGetWarehouses(token: string) {
  return useQuery({
    // eslint-disable-next-line
    queryKey: ['warehouses'],
    queryFn: () =>
      fetch(`${API_URL}/Warehouses`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (response): Promise<Array<Warehouse>> => {
          const data = await response.json();
          let warehouses: Array<Warehouse> = data;

          if (!Array.isArray(data)) {
            warehouses = [data];
          }

          return warehouses.map((warehouse: any) => ({
            id: warehouse['id'],
            name: warehouse['name'],
          }));
        })
        .catch((error) => {
          console.error(error);
          alert(
            `Nie udało się pobrać magazynów. Szczegóły: ${JSON.stringify(error)}`,
          );
          return null;
        }),
    enabled: !!token,
  });
}
