import { getBitrix24 } from '../../utils/bitrix24.ts';
import { CONTACT_DISCOUNT_FIELD } from './field.ts';

export type Contact = {
  id: number;
  name: string;
  lastName: string;
  phone?: string;
  email?: string;
  discount?: number;
};

export async function getContact(contactId: number): Promise<Contact | null> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const getContactCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się pobrać danych firmy. Szczegóły w konsoli');
        reject();
      } else {
        const data = result.data();
        const discountField = data[CONTACT_DISCOUNT_FIELD];

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
          name: data['NAME'],
          lastName: data['LAST_NAME'],
          phone: data['PHONE']?.[0]?.['VALUE'],
          email: data['EMAIL']?.[0]?.['VALUE'],
          discount,
        });
      }
    };

    bx24.callMethod('crm.contact.get', { id: contactId }, getContactCallback);
  });
}
