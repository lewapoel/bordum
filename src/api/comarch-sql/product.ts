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

export async function setProductGroups(
  token: string,
  code: string,
  groups: GroupsCodes,
): Promise<boolean> {
  return fetch(`${SQL_API_URL}/product-groups`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_code: code,
      group_codes: groups,
    }),
  })
    .then(async (response): Promise<boolean> => {
      const data = await response.json();

      return response.ok && data['success'];
    })
    .catch((error) => {
      console.error(error);
      alert('Nie udało się ustawić grupy produktu');
      return false;
    });
}

export async function setProductPrice(
  token: string,
  code: string,
  priceName: string,
  value: number,
): Promise<boolean> {
  return fetch(`${SQL_API_URL}/product-price`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_code: code,
      price_name: priceName,
      value,
    }),
  })
    .then(async (response): Promise<boolean> => {
      const data = await response.json();

      return response.ok && data['success'];
    })
    .catch((error) => {
      console.error(error);
      alert('Nie udało się ustawić ceny produktu');
      return false;
    });
}
