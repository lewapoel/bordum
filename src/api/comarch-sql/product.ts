import { SQL_API_URL } from './const.ts';

export type GroupsCodes = Array<string>;
export type ProductGroups = { [productCode: string]: GroupsCodes };

export async function getProductGroups(
  token: string,
): Promise<ProductGroups | null> {
  return fetch(`${SQL_API_URL}/product-groups`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(async (response): Promise<ProductGroups | null> => {
      const data = await response.json();

      if (!response.ok || !data) {
        return null;
      }

      return data;
    })
    .catch((error) => {
      console.error(error);
      alert('Nie udało się pobrać grup produktów');
      return null;
    });
}
