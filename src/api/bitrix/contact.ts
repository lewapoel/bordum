import { getBitrix24 } from '@/utils/bitrix24.ts';
import { Contact } from '@/models/bitrix/contact.ts';

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

        resolve({
          id: +data['ID'],
          name: data['NAME'],
          lastName: data['LAST_NAME'],
          phone: data['PHONE']?.[0]?.['VALUE'],
          email: data['EMAIL']?.[0]?.['VALUE'],
        });
      }
    };

    bx24.callMethod('crm.contact.get', { id: contactId }, getContactCallback);
  });
}
