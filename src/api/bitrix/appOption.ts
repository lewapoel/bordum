import { getBitrix24 } from '@/utils/bitrix24.ts';

export function getAppOption(name: string): any | null {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  return bx24.appOption.get(name);
}

export async function setAppOption(name: string, value: any): Promise<boolean> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return false;
  }

  return new Promise((resolve, reject) => {
    const setAppOptionCallback = (result: any) => {
      if (result?.error) {
        console.error(result.error);
        alert('Nie udało się zapisać danych aplikacji. Szczegóły w konsoli');
        reject();
      } else {
        resolve(true);
      }
    };

    bx24.appOption.set(name, value, setAppOptionCallback);
  });
}
