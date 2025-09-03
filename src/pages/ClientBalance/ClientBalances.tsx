import { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../../components/AuthContext.tsx';
import { useGetCreditCustomers } from '@/api/comarch-sql/customer.ts';
import { InvoiceData, Invoices } from '@/models/bitrix/invoice.ts';
import { getDueInvoices } from '@/api/bitrix/invoice.ts';
import clsx from 'clsx';
import { getBitrix24 } from '@/utils/bitrix24.ts';
import { formatMoney } from '@/utils/format.ts';

export default function ClientBalances() {
  const { sqlToken } = useContext(AuthContext);

  const query = useGetCreditCustomers(sqlToken);
  const clients = query.data;

  const [invoices, setinvoices] = useState<Invoices>();

  const clientsCodes = useMemo(() => {
    if (clients) {
      return clients.map((client) => client.code);
    }

    return [];
  }, [clients]);

  const usedLimitSum = useMemo(() => {
    if (invoices) {
      return Object.entries(invoices).reduce((acc, [code, clientInvoices]) => {
        // Is the invoice connected with a client existing in Comarch?
        if (clientsCodes.includes(code)) {
          const sum = clientInvoices.reduce((invoicesAcc, invoice) => {
            invoicesAcc += invoice.paymentLeft ?? 0;
            return invoicesAcc;
          }, 0);

          acc += sum;
        }

        return acc;
      }, 0);
    }

    return 0;
  }, [invoices, clientsCodes]);

  useEffect(() => {
    getDueInvoices().then((res) => {
      if (res) {
        setinvoices(res);
      }
    });
  }, []);

  const navigateToClient = (clientInvoices: Array<InvoiceData>) => {
    if (clientInvoices) {
      const bx24 = getBitrix24();
      if (!bx24) {
        return;
      }

      if (clientInvoices[0].companyId) {
        bx24.openPath(`/crm/company/details/${clientInvoices[0].companyId}/`);
      } else if (clientInvoices[0].contactId) {
        bx24.openPath(`/crm/contact/details/${clientInvoices[0].contactId}/`);
      }
    }
  };

  return clients && invoices ? (
    <>
      <h1 className='mb-5'>Limity handlowe (brutto)</h1>
      <h2 className='mb-5'>
        Suma wykorzystanego limitu:{' '}
        <span className='text-red-500 font-bold'>
          {formatMoney(usedLimitSum)}
        </span>
      </h2>

      <table>
        <thead>
          <tr>
            <th>Klient</th>
            <th>Przyznany limit</th>
            <th>Wykorzystany limit</th>
            <th>Dostępny limit</th>
            <th>Oferty z limitem</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const clientInvoices = invoices[client.code];
            const creditLimit = client.creditLimit;
            const unpaidInvoices =
              clientInvoices?.reduce((acc, invoice) => {
                if (invoice.paymentLeft) {
                  acc += invoice.paymentLeft;
                }

                return acc;
              }, 0) ?? 0;
            const limitLeft = creditLimit - unpaidInvoices;
            const offerCount =
              clientInvoices?.reduce((acc, invoice) => {
                if (invoice.order) {
                  acc += 1;
                }

                return acc;
              }, 0) ?? 0;

            return (
              <tr key={client.id}>
                <td
                  className={clsx(
                    clientInvoices ? 'cursor-pointer underline' : '',
                  )}
                  onClick={() => navigateToClient(clientInvoices)}
                >
                  {client.name}
                </td>
                <td>{formatMoney(creditLimit)}</td>
                <td className='text-red-500 font-bold'>
                  {formatMoney(unpaidInvoices)}
                </td>
                <td className='text-green-500 font-bold'>
                  {formatMoney(limitLeft)}
                </td>
                <td className='text-blue-500 font-bold'>{offerCount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  ) : query.isLoading || !invoices ? (
    <h1>Ładowanie listy klientów...</h1>
  ) : (
    <h1>Brak klientów</h1>
  );
}
