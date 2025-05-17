import { getBitrix24 } from '../../utils/bitrix24.ts';
import { USER_DISCOUNT_FIELD } from '../../data/bitrix/field.ts';
import { User } from '../../models/bitrix/user.ts';

export async function getUsers(): Promise<Array<User> | null> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const getUsersCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się pobrać użytkowników. Szczegóły w konsoli');
        reject();
      } else {
        const data = result.data();
        const discountField = data[USER_DISCOUNT_FIELD];

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

        resolve(
          data.map(
            (item: any): User => ({
              id: +item['ID'],
              firstName: item['NAME'],
              lastName: item['LAST_NAME'],
              email: item['EMAIL'],
              discount,
            }),
          ),
        );
      }
    };

    bx24.callMethod('user.get', {}, getUsersCallback);
  });
}

export async function getCurrentUser(): Promise<User | null> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const getUserCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert(
          'Nie udało się pobrać aktualnego użytkownika. Szczegóły w konsoli',
        );
        reject();
      } else {
        const data = result.data();
        const discountField = data[USER_DISCOUNT_FIELD];

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
          firstName: data['NAME'],
          lastName: data['LAST_NAME'],
          email: data['EMAIL'],
          discount,
        });
      }
    };

    bx24.callMethod('user.current', {}, getUserCallback);
  });
}
