import { getBitrix24 } from '../../utils/bitrix24.ts';

export type User = {
  id: number;
  firstName: string;
  lastName: string;
};

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

        resolve(
          data.map(
            (item: any): User => ({
              id: +item['ID'],
              firstName: item['NAME'],
              lastName: item['LAST_NAME'],
            }),
          ),
        );
      }
    };

    bx24.callMethod('user.get', {}, getUsersCallback);
  });
}
