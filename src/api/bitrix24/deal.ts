import { getBitrix24 } from '../../utils/bitrix24.ts';
import { DealData } from '../../models/bitrix/deal.ts';

export async function getDeal(placementId: number): Promise<DealData | null> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const getDealCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się pobrać deala. Szczegóły w konsoli');
        reject();
      } else {
        const data = result.data();

        resolve({
          id: data['ID'] ?? undefined,
          companyId: data['COMPANY_ID'] ?? undefined,
          contactId: data['CONTACT_ID'] ?? undefined,
        });
      }
    };

    bx24.callMethod('crm.deal.get', { id: placementId }, getDealCallback);
  });
}
