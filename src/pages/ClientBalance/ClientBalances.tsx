import { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../../components/AuthContext.tsx';
import { useGetCreditCustomers } from '../../api/comarch-sql/customer.ts';
import { SettlementData, Settlements } from '../../models/bitrix/settlement.ts';
import { getDueSettlements } from '../../api/bitrix/settlement.ts';
import clsx from 'clsx';
import { getBitrix24 } from '../../utils/bitrix24.ts';
import { formatMoney } from '../../utils/format.ts';

export default function ClientBalances() {
  const { sqlToken } = useContext(AuthContext);

  const query = useGetCreditCustomers(sqlToken);
  const clients = query.data;

  const [settlements, setSettlements] = useState<Settlements>();

  const clientsCodes = useMemo(() => {
    if (clients) {
      return clients.map((client) => client.code);
    }

    return [];
  }, [clients]);

  const usedLimitSum = useMemo(() => {
    if (settlements) {
      return Object.entries(settlements).reduce((acc, [code, settlements]) => {
        // Is the settlement connected with a client existing in Comarch?
        if (clientsCodes.includes(code)) {
          const sum = settlements.reduce((settlementsAcc, settlement) => {
            settlementsAcc += settlement.paymentLeft ?? 0;
            return settlementsAcc;
          }, 0);

          acc += sum;
        }

        return acc;
      }, 0);
    }

    return 0;
  }, [settlements, clientsCodes]);

  useEffect(() => {
    getDueSettlements().then((res) => {
      if (res) {
        setSettlements(res);
      }
    });
  }, []);

  const navigateToClient = (clientSettlements: Array<SettlementData>) => {
    if (clientSettlements) {
      const bx24 = getBitrix24();
      if (!bx24) {
        return;
      }

      if (clientSettlements[0].companyId) {
        bx24.openPath(
          `/crm/company/details/${clientSettlements[0].companyId}/`,
        );
      } else if (clientSettlements[0].contactId) {
        bx24.openPath(
          `/crm/contact/details/${clientSettlements[0].contactId}/`,
        );
      }
    }
  };

  return clients && settlements ? (
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
            const clientSettlements = settlements[client.code];
            const creditLimit = client.creditLimit;
            const unpaidSettlements =
              clientSettlements?.reduce((acc, settlement) => {
                if (settlement.paymentLeft) {
                  acc += settlement.paymentLeft;
                }

                return acc;
              }, 0) ?? 0;
            const limitLeft = creditLimit - unpaidSettlements;
            const offerCount =
              clientSettlements?.reduce((acc, settlement) => {
                if (settlement.order) {
                  acc += 1;
                }

                return acc;
              }, 0) ?? 0;

            return (
              <tr key={client.id}>
                <td>{client.name}</td>
                <td>{formatMoney(creditLimit)}</td>
                <td
                  className={clsx(
                    clientSettlements ? 'cursor-pointer underline' : '',
                    'text-red-500 font-bold',
                  )}
                  onClick={() => navigateToClient(clientSettlements)}
                >
                  {formatMoney(unpaidSettlements)}
                </td>
                <td className='text-green-500 font-bold'>
                  {formatMoney(limitLeft)}
                </td>
                <td
                  className={clsx(
                    clientSettlements ? 'cursor-pointer underline' : '',
                    'text-blue-500 font-bold',
                  )}
                  onClick={() => navigateToClient(clientSettlements)}
                >
                  {offerCount}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  ) : query.isLoading || !settlements ? (
    <h1>Ładowanie listy klientów...</h1>
  ) : (
    <h1>Brak klientów</h1>
  );
}
