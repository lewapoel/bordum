import { getBitrix24 } from '@/utils/bitrix24.ts';
import { useMemo } from 'react';

export function getAppOption(name: string): any | null {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  return bx24.appOption.get(name);
}

export function useGetAppOption(name: string): any | null {
  const current = getAppOption(name);
  return useMemo(() => current, [current]);
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
        alert(
          `Nie udało się zapisać danych aplikacji. Szczegóły: ${result.error()?.ex?.error_description}`,
        );
        reject();
      } else {
        resolve(true);
      }
    };

    bx24.appOption.set(name, value, setAppOptionCallback);
  });
}
