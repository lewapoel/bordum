import { getBitrix24 } from '../../utils/bitrix24.ts';
import { COMPANY_DISCOUNT_FIELD, COMPANY_NIP_FIELD } from './field.ts';

export type Company = {
  id: number;
  title: string;
  nip?: string;
  discount?: number;
};

export async function getCompany(companyId: number): Promise<Company | null> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const getCompanyCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się pobrać danych firmy. Szczegóły w konsoli');
        reject();
      } else {
        const data = result.data();
        const discountField = data[COMPANY_DISCOUNT_FIELD];

        let discount: number | undefined;

        if (
          !discountField ||
          discountField.length === 0 ||
          isNaN(+discountField)
        ) {
          discount = undefined;
        } else {
          discount = +discountField;
        }

        resolve({
          id: +data['ID'],
          title: data['TITLE'],
          nip: data[COMPANY_NIP_FIELD] || undefined,
          discount,
        });
      }
    };

    bx24.callMethod('crm.company.get', { id: companyId }, getCompanyCallback);
  });
}
