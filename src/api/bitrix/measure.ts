import { getHashCode } from '../../utils/hash.ts';
import { getBitrix24 } from '../../utils/bitrix24.ts';
import { Measures } from '../../models/bitrix/measure.ts';

export async function getMeasures(): Promise<Measures | null> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const getMeasuresCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się pobrać danych jednostek. Szczegóły w konsoli');
        reject();
      } else {
        const data = result.data();
        const measures: Measures = {};

        data.forEach((measure: any) => {
          measures[measure['SYMBOL_RUS']] = {
            code: measure['CODE'],
            symbol: measure['SYMBOL_RUS'],
          };
        });

        resolve(measures);
      }
    };

    bx24.callMethod('crm.measure.list', {}, getMeasuresCallback);
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
          alert('Nie udało się dodać jednostki. Szczegóły w konsoli');
          reject();
        } else {
          resolve(true);
        }
      };

      bx24.callMethod(
        'crm.measure.add',
        { fields: { CODE: code, MEASURE_TITLE: symbol, SYMBOL_RUS: symbol } },
        addMeasureCallback,
      );
    } else {
      resolve(true);
    }
  });
}
