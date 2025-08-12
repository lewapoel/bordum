import { SQL_API_URL } from './const.ts';
import { useQuery } from '@tanstack/react-query';

export type CreditCustomer = {
  id: number;
  code: string;
  vatNumber: string;
  name: string;
  creditLimit?: number;
  invoicesUnpaid: number;
};

export function useGetCreditCustomers(token: string) {
  return useQuery({
    // eslint-disable-next-line
    queryKey: ['credit-customers'],
    queryFn: () =>
      fetch(`${SQL_API_URL}/credit-customers`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (response): Promise<Array<CreditCustomer> | null> => {
          const data = await response.json();

          if (!data) {
            return null;
          }

          return data.map(
            (customer: any): CreditCustomer => ({
              id: +customer['id'],
              code: customer['code'],
              vatNumber: customer['vat_number'],
              name: customer['name'],
              creditLimit: customer['credit_limit']
                ? +customer['credit_limit']
                : undefined,
              invoicesUnpaid: customer['invoices_unpaid'],
            }),
          );
        })
        .catch((error) => {
          console.error(error);
          alert('Nie udało się pobrać sald klientów');
          return null;
        }),
    enabled: !!token,
  });
}

export function useGetCreditCustomer(token: string, code?: string) {
  return useQuery({
    // eslint-disable-next-line
    queryKey: ['credit-customer', code],
    queryFn: () =>
      fetch(`${SQL_API_URL}/credit-customers/${code}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (response): Promise<CreditCustomer | null> => {
          const data = await response.json();

          if (!data) {
            return null;
          }

          return {
            id: +data['id'],
            code: data['code'],
            vatNumber: data['vat_number'],
            name: data['name'],
            creditLimit: data['credit_limit']
              ? +data['credit_limit']
              : undefined,
            invoicesUnpaid: data['invoices_unpaid'],
          };
        })
        .catch((error) => {
          console.error(error);
          alert('Nie udało się pobrać salda klienta');
          return null;
        }),
    enabled: !!token && !!code,
  });
}
