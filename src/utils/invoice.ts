import { useMemo } from 'react';
import { CreditCustomer } from '../api/comarch-sql/customer.ts';
import { InvoiceData } from '../models/bitrix/invoice.ts';

export function useGetInvoicesSummary(
  client?: CreditCustomer | null,
  invoices?: Array<InvoiceData>,
) {
  const creditLimit = useMemo(() => client?.creditLimit ?? 0, [client]);
  const unpaidInvoices = useMemo(
    () =>
      invoices?.reduce((acc, invoice) => {
        if (invoice.paymentLeft) {
          acc += invoice.paymentLeft;
        }

        return acc;
      }, 0) ?? 0,
    [invoices],
  );

  const limitLeft = useMemo(
    () => creditLimit - unpaidInvoices,
    [creditLimit, unpaidInvoices],
  );

  return [creditLimit, unpaidInvoices, limitLeft];
}
