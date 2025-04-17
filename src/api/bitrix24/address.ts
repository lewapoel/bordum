import { getBitrix24 } from '../../utils/bitrix24.ts';

export type Address = {
  city?: string;
  postalCode?: string;
  country?: string;

  // Street, house, building, structure
  address1?: string;

  // Apartment / office
  address2?: string;
};

export async function getAddress(
  anchorTypeId: number,
  anchorId: number,
): Promise<Address | null> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const getAddressCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się pobrać danych adresu. Szczegóły w konsoli');
        reject();
      } else {
        const data = result.data();
        const addressData = data[0];

        if (addressData) {
          resolve({
            address1: addressData['ADDRESS_1'] || undefined,
            address2: addressData['ADDRESS_2'] || undefined,
            city: addressData['CITY'] || undefined,
            country: addressData['COUNTRY'] || undefined,
            postalCode: addressData['POSTAL_CODE'] || undefined,
          });
        } else {
          resolve(null);
        }
      }
    };

    bx24.callMethod(
      'crm.address.list',
      { filter: { ANCHOR_TYPE_ID: anchorTypeId, ANCHOR_ID: anchorId } },
      getAddressCallback,
    );
  });
}
