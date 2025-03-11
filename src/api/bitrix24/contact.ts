import { getBitrix24 } from '../../utils/bitrix24.ts';

export type Contact = {
  id: number;
  name: string;
  lastName: string;
  phone?: string;
  email?: string;
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

        resolve(
          data.map(
            (item: any): Contact => ({
              id: +item['ID'],
              name: item['NAME'],
              lastName: item['LAST_NAME'],
              phone: item['PHONE']?.[0]?.['VALUE'],
              email: item['EMAIL']?.[0]?.['VALUE'],
            }),
          ),
        );
      }
    };

    bx24.callMethod('crm.contact.get', { id: contactId }, getContactCallback);
  });
}
