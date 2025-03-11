import { getBitrix24 } from '../../utils/bitrix24.ts';

export type Company = {
  id: number;
  title: string;
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

        resolve(
          data.map(
            (item: any): Company => ({
              id: +item['ID'],
              title: item['TITLE'],
            }),
          ),
        );
      }
    };

    bx24.callMethod('crm.company.get', { id: companyId }, getCompanyCallback);
  });
}
