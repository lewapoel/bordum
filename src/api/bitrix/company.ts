import { getBitrix24 } from '../../utils/bitrix24.ts';
import { COMPANY_NIP_FIELD } from '../../data/bitrix/field.ts';
import { Company } from '../../models/bitrix/company.ts';

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

        resolve({
          id: +data['ID'],
          title: data['TITLE'],
          nip: data[COMPANY_NIP_FIELD] || undefined,
          email: data['EMAIL']?.[0]?.['VALUE'],
          phone: data['PHONE']?.[0]?.['VALUE'],
        });
      }
    };

    bx24.callMethod('crm.company.get', { id: companyId }, getCompanyCallback);
  });
}
