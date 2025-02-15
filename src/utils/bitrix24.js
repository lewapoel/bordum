// src/utils/bitrix24.js

import { ORDER_DATA_FIELD_ID } from "../api/const";

export function getBitrix24() {
  if (!window.BX24) {
    alert("Brak dostępnego API Bitrix24");
    return null;
  }

  return window.BX24;
}

export function getCurrentDealId() {
  const bx24 = getBitrix24();

  // Error alert is shown in `getBitrix24`
  if (!bx24) {
    return null;
  }

  const dealId = bx24.placement?.info?.()?.options?.ID;
  if (!dealId) {
    return null;
  }

  return dealId;
}

export async function getCurrentDealOrderData() {
  const dealId = getCurrentDealId();

  if (!dealId) {
    return null;
  }

  const bx24 = getBitrix24();

  return new Promise((resolve, reject) => {
    const getOrderDataCallback = (result) => {
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
