import { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../../components/AuthContext.tsx';
import { useGetCreditCustomer } from '../../api/comarch-sql/customer.ts';
import { SettlementData } from '../../models/bitrix/settlement.ts';
import { getDueSettlements } from '../../api/bitrix/settlement.ts';
import {
  getCompanyCode,
  getContactCode,
  getCurrentPlacement,
  getCurrentPlacementId,
} from '../../utils/bitrix24.ts';
import { getCompany } from '../../api/bitrix/company.ts';
import { getContact } from '../../api/bitrix/contact.ts';
import { formatMoney } from '../../utils/format.ts';

export default function ClientBalance() {
  const { sqlToken } = useContext(AuthContext);

  const [error, setError] = useState(false);
  const [code, setCode] = useState<string>();
  const [settlements, setSettlements] = useState<Array<SettlementData>>();

  const query = useGetCreditCustomer(sqlToken, code);
  const client = query.data;

  const creditLimit = useMemo(() => client?.creditLimit ?? 0, [client]);
  const unpaidSettlements = useMemo(
    () =>
      settlements?.reduce((acc, settlement) => {
        if (settlement.paymentLeft) {
          acc += settlement.paymentLeft;
        }

        return acc;
      }, 0) ?? 0,
    [settlements],
  );
  const limitLeft = useMemo(
    () => creditLimit - unpaidSettlements,
    [creditLimit, unpaidSettlements],
  );

  useEffect(() => {
    const placement = getCurrentPlacement();
    const placementId = getCurrentPlacementId();

    if (!placement || !placementId) {
      setError(true);
    } else {
      switch (placement) {
        case 'CRM_COMPANY_DETAIL_TAB':
          getCompany(+placementId).then((company) => {
            if (company) {
              setCode(getCompanyCode(company));

              getDueSettlements({
                companyId: +placementId,
              }).then((res) => {
                if (res) {
                  setSettlements(Object.values(res)[0]);
                }
              });
            } else {
              setError(true);
            }
          });
          break;

        case 'CRM_CONTACT_DETAIL_TAB':
          getContact(+placementId).then((contact) => {
            if (contact) {
              setCode(getContactCode(contact));

              getDueSettlements({
                contactId: +placementId,
              }).then((res) => {
                if (res) {
                  setSettlements(Object.values(res)[0]);
                }
              });
            } else {
              setError(true);
            }
          });
          break;

        default:
          setError(true);
          break;
      }
    }
  }, []);

  console.log('client', client);
  console.log('settlements', settlements);

  return client && settlements && !error ? (
    <>
      <h1 className='mb-5'>Limit handlowy (brutto)</h1>
      <h2 className='mb-5'>{client.name}</h2>

      <table>
        <thead>
          <tr>
            <th>Przyznany limit</th>
            <th>Wykorzystany limit</th>
            <th>Dostępny limit</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{formatMoney(creditLimit)}</td>
            <td className='text-orange-500 font-bold'>
              {formatMoney(unpaidSettlements)}
            </td>
            <td className='text-green-500 font-bold'>
              {formatMoney(limitLeft)}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  ) : (
    <>
      {error && <h1>Wystąpił błąd</h1>}
      {!error && (query.isLoading || !settlements) && (
        <h1>Ładowanie danych klienta...</h1>
      )}
      {!error &&
        !query.isLoading &&
        settlements &&
        settlements.length === 0 && <h1>Brak zaległości</h1>}
      {!error &&
        !query.isLoading &&
        settlements &&
        settlements.length > 0 &&
        !client && <h1>Nie znaleziono klienta w Comarch</h1>}
    </>
  );
}
