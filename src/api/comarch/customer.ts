import { API_URL } from './const.ts';
import { useQuery } from '@tanstack/react-query';
import { CustomerDefaultPrice } from '@/models/comarch/customer.ts';

export type Customer = {
  id: number;
  code: string;
  vatNumber: string;
  name1: string;
  defaultPrice: CustomerDefaultPrice;
};

export function useGetCustomerByNip(token: string, nip?: string) {
  return useQuery({
    queryKey: ['customer/nip', nip],
    queryFn: () => {
      if (nip) {
        const params = new URLSearchParams({
          vatNumber: nip,
        });

        return fetch(`${API_URL}/Customers?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(async (response): Promise<Customer | null> => {
            const data = await response.json();

            if (!data) {
              return null;
            }

            return {
              id: data['id'],
              code: data['code'],
              vatNumber: data['vatNumber'],
              name1: data['name1'],
              defaultPrice:
                data['defaultPrice'] ?? CustomerDefaultPrice.Default,
            };
          })
          .catch((error) => {
            console.error(error);
            alert(
              `Nie udało się pobrać kontrahenta. Szczegóły: ${JSON.stringify(error)}`,
            );
            return null;
          });
      }
    },
    enabled: !!token && !!nip,
  });
}

export function useGetCustomerByName(token: string, name?: string) {
  return useQuery({
    queryKey: ['customer/name', name],
    queryFn: () => {
      if (name) {
        return fetch(`${API_URL}/Customers?limit=999999999`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(async (response): Promise<Customer | null> => {
            const data = await response.json();

            const customers: Array<Customer> = data.map((customer: any) => ({
              id: customer['id'],
              code: customer['code'],
              vatNumber: customer['vatNumber'],
              name1: customer['name1'],
              defaultPrice:
                customer['defaultPrice'] ?? CustomerDefaultPrice.Default,
            }));

            const customer = customers.find(
              (customer) => customer.name1.toLowerCase() === name.toLowerCase(),
            );

            return customer ?? null;
          })
          .catch((error) => {
            console.error(error);
            alert(
              `Nie udało się pobrać kontrahentów. Szczegóły: ${JSON.stringify(error)}`,
            );
            return null;
          });
      }
    },
    enabled: !!token && !!name,
  });
}
