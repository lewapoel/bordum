// src/utils/bitrix24.js

import { ORDER_DATA_FIELD_ID } from "../api/const";

export function getBitrix24() {
  // @ts-ignore
  if (!window.BX24) {
    alert("Brak dostępnego API Bitrix24");
    return null;
  }

  // @ts-ignore
  return window.BX24;
}

export function getCurrentPlacementId() {
  const bx24 = getBitrix24();

  // Error alert is shown in `getBitrix24`
  if (!bx24) {
    return null;
  }

  const id = bx24.placement?.info?.()?.options?.ID;
  if (!id) {
    return null;
  }

  return id;
}

export async function getCurrentDealOrderData() {
  const dealId = getCurrentPlacementId();

  if (!dealId) {
    return null;
  }

  const bx24 = getBitrix24();

  return new Promise((resolve, reject) => {
    const getOrderDataCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert("Nie udało się pobrać danych zamówienia. Szczegóły w konsoli");
        reject();
      } else {
        const data = result.data();
        resolve(
          data[ORDER_DATA_FIELD_ID]
            ? JSON.parse(data[ORDER_DATA_FIELD_ID])
            : null,
        );
      }
    };

    bx24.callMethod("crm.deal.get", { id: dealId }, getOrderDataCallback);
  });
}
