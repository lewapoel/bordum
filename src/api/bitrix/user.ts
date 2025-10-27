import { getBitrix24 } from '@/utils/bitrix24.ts';
import { USER_DISCOUNT_FIELD } from '@/data/bitrix/field.ts';
import { User } from '@/models/bitrix/user.ts';

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

export async function isCurrentUserAdmin(): Promise<boolean> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return false;
  }

  return new Promise((resolve, reject) => {
    const getUserAdminCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert(
          'Nie udało się pobrać aktualnego użytkownika. Szczegóły w konsoli',
        );
        reject();
      } else {
        const data = result.data();
        resolve(data);
      }
    };

    bx24.callMethod('user.admin', {}, getUserAdminCallback);
  });
}
