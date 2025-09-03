import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../components/AuthContext.tsx';
import { useGetCreditCustomer } from '@/api/comarch-sql/customer.ts';
import { InvoiceData } from '@/models/bitrix/invoice.ts';
import {
  getCompanyCode,
  getContactCode,
  getCurrentPlacement,
  getCurrentPlacementId,
} from '@/utils/bitrix24.ts';
import { getCompany } from '@/api/bitrix/company.ts';
import { getContact } from '@/api/bitrix/contact.ts';
import { formatMoney } from '@/utils/format.ts';
import { getClientDueInvoices } from '@/api/bitrix/invoice.ts';
import { useGetInvoicesSummary } from '@/utils/invoice.ts';

export default function ClientBalance() {
  const { sqlToken } = useContext(AuthContext);

  const [error, setError] = useState(false);
  const [code, setCode] = useState<string>();
  const [invoices, setInvoices] = useState<Array<InvoiceData>>();

  const query = useGetCreditCustomer(sqlToken, code);
  const client = query.data;

  const [creditLimit, unpaidInvoices, limitLeft] = useGetInvoicesSummary(
    client,
    invoices,
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

              getClientDueInvoices({
                companyId: +placementId,
              }).then((res) => setInvoices(res));
            } else {
              setError(true);
            }
          });
          break;

        case 'CRM_CONTACT_DETAIL_TAB':
          getContact(+placementId).then((contact) => {
            if (contact) {
              setCode(getContactCode(contact));

              getClientDueInvoices({
                contactId: +placementId,
              }).then((res) => setInvoices(res));
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

  return client && invoices && !error ? (
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
              {formatMoney(unpaidInvoices)}
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
      {!error && (query.isLoading || !invoices) && (
        <h1>Ładowanie danych klienta...</h1>
      )}
      {!error && !query.isLoading && invoices && invoices.length === 0 && (
        <h1>Brak zaległości</h1>
      )}
      {!error &&
        !query.isLoading &&
        invoices &&
        invoices.length > 0 &&
        !client && <h1>Nie znaleziono klienta w Comarch</h1>}
    </>
  );
}
