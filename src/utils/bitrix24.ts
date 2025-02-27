// src/utils/bitrix24.js

import { ORDER_DATA_FIELD_ID } from "../api/const";
import { getHashCode } from "./hash.ts";

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

type Measure = {
  code: string;
  symbol: string;
};

type Measures = { [symbol: string]: Measure };

export async function getMeasures(): Promise<Measures | null> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const getMeasuresCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert("Nie udało się pobrać danych jednostek. Szczegóły w konsoli");
        reject();
      } else {
        const data = result.data();
        const measures: Measures = {};

        data.forEach((measure: any) => {
          measures[measure["SYMBOL_RUS"]] = {
            code: measure["CODE"],
            symbol: measure["SYMBOL_RUS"],
          };
        });

        resolve(measures);
      }
    };

    bx24.callMethod("crm.measure.list", {}, getMeasuresCallback);
  });
}

// Ensure that a measure with provided symbol exists, if not, create it
export async function ensureMeasure(symbol: string) {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  const measures = await getMeasures();
  if (!measures) {
    return null;
  }

  // Code is a required index of the measure, and because Bitrix doesn't provide automatic numbering,
  // a numeric hash of the symbol is used
  const code = await getHashCode(symbol);

  return new Promise((resolve, reject) => {
    if (!Object.keys(measures).includes(symbol)) {
      const addMeasureCallback = (result: any) => {
        if (result.error()) {
          console.error(result.error());
          alert("Nie udało się dodać jednostki. Szczegóły w konsoli");
          reject();
        } else {
          resolve(true);
        }
      };

      bx24.callMethod(
        "crm.measure.add",
        { fields: { CODE: code, MEASURE_TITLE: symbol, SYMBOL_RUS: symbol } },
        addMeasureCallback,
      );
    } else {
      resolve(true);
    }
  });
}
