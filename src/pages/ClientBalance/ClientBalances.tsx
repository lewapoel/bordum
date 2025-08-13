import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../components/AuthContext.tsx';
import { useGetCreditCustomers } from '../../api/comarch-sql/customer.ts';
import { Settlements } from '../../models/bitrix/settlement.ts';
import { getDueSettlements } from '../../api/bitrix/settlement.ts';
import clsx from 'clsx';
import { getBitrix24 } from '../../utils/bitrix24.ts';
import { SETTLEMENT_CATEGORIES } from '../../data/bitrix/const.ts';

export default function ClientBalances() {
  const { sqlToken } = useContext(AuthContext);

  const query = useGetCreditCustomers(sqlToken);
  const clients = query.data;

  const [settlements, setSettlements] = useState<Settlements>();

  useEffect(() => {
    getDueSettlements({
      categoryId: SETTLEMENT_CATEGORIES.NO_INVOICE,
    }).then((res) => {
      if (res) {
        setSettlements(res);
      }
    });
  }, []);

  return clients && settlements ? (
    <>
      <h1 className='mb-5'>Salda klientów</h1>

      <table>
        <thead>
          <tr>
            <th>Klient</th>
            <th>Limit handlowy</th>
            <th>Dostępne saldo</th>
            <th>Nierozliczone faktury</th>
            <th>Nierozliczona gotówka</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const settlement = settlements[client.code];
            const creditLimit = client.creditLimit ?? 0;

            const unpaidInvoices = client.invoicesUnpaid;
            const unpaidCash =
              settlement?.reduce((acc, settlement) => {
                if (settlement.paymentLeft) {
                  acc += settlement.paymentLeft;
                }

                return acc;
              }, 0) ?? 0;

            const balanceLeft = creditLimit - unpaidInvoices - unpaidCash;

            return (
              (unpaidInvoices !== 0 ||
                unpaidCash !== 0 ||
                balanceLeft !== 0) && (
                <tr key={client.id}>
                  <td
                    className={clsx(
                      settlement ? 'cursor-pointer underline' : '',
                    )}
                    onClick={() => {
                      if (settlement) {
                        const bx24 = getBitrix24();
                        if (!bx24) {
                          return;
                        }

                        if (settlement[0].companyId) {
                          bx24.openPath(
                            `/crm/company/details/${settlement[0].companyId}/`,
                          );
                        } else if (settlement[0].contactId) {
                          bx24.openPath(
                            `/crm/contact/details/${settlement[0].contactId}/`,
                          );
                        }
                      }
                    }}
                  >
                    {client.name}
                  </td>
                  <td>{client.creditLimit ?? '-'}</td>
                  <td>{balanceLeft}</td>
                  <td>{unpaidInvoices}</td>
                  <td>{unpaidCash}</td>
                </tr>
              )
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
