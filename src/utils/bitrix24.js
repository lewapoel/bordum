// src/utils/bitrix24.js

export function getBitrix24() {
  if (!window.BX24) {
    alert("Brak dostępnego API Bitrix24");
    return null;
  }

  return window.BX24;
}
