import { getBitrix24 } from '../../utils/bitrix24.ts';
import { Order, OrderItem } from '../../models/order.ts';
import { ensureMeasure, getMeasures } from './measure.ts';

export async function getOrderMetadata(
  placementId: number,
): Promise<Order | null> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const getOrderCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się pobrać oferty. Szczegóły w konsoli');
        reject();
      } else {
        const data = result.data();

        resolve({
          dealId: data['DEAL_ID'] ?? undefined,
          leadId: data['LEAD_ID'] ?? undefined,
        });
      }
    };

    bx24.callMethod('crm.quote.get', { id: placementId }, getOrderCallback);
  });
}

export async function getOrder(
  placementId: number,
): Promise<Array<OrderItem> | null> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const getProductRowsCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się pobrać produktów oferty. Szczegóły w konsoli');
        reject();
      } else {
        const data = result.data();

        resolve(
          data.map(
            (item: any): OrderItem => ({
              id: item['ID'],
              productName: item['PRODUCT_NAME'],
              quantity: item['QUANTITY'],
              unit: item['MEASURE_NAME'],
              unitPrice: item['PRICE'],
            }),
          ),
        );
      }
    };

    bx24.callMethod(
      'crm.quote.productrows.get',
      { id: placementId },
      getProductRowsCallback,
    );
  });
}

export async function updateOrder(
  placementId: number,
  order: Array<OrderItem>,
  ensureMeasures: boolean,
  showAlertOnSuccess: boolean = true,
) {
  const bx24 = getBitrix24();
  if (!bx24) {
    return null;
  }

  if (ensureMeasures) {
    for (const item of order) {
      await ensureMeasure(item.unit);
    }
  }

  const measures = await getMeasures();
  if (!measures) {
    return;
  }

  for (const item of order) {
    item.unitCode = measures[item.unit].code;
  }

  return new Promise((resolve, reject) => {
    const setProductRowsCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się zapisać produktów oferty. Szczegóły w konsoli');
        reject();
      } else {
        if (showAlertOnSuccess) {
          alert('Produkty oferty zapisane pomyślnie');
        }

        resolve(true);
      }
    };

    const updateBody = {
      id: placementId,
      rows:
        order.length !== 0
          ? order.map((item) => ({
              PRODUCT_NAME: item.productName,
              PRICE: item.unitPrice,
              QUANTITY: item.quantity,
              MEASURE_CODE: item.unitCode,
            }))
          : null,
    };

    bx24.callMethod(
      'crm.quote.productrows.set',
      updateBody,
      setProductRowsCallback,
    );
  });
}
