import { getBitrix24 } from '../../utils/bitrix24.ts';
import {
  OrderData,
  OrderItem,
  PackagingData,
} from '../../models/bitrix/order.ts';
import { ensureMeasure, getMeasures } from './measure.ts';
import {
  ORDER_ADDITIONAL_DATA_FIELD,
  ORDER_BUYER_NIP_FIELD,
  ORDER_PACKAGING_DATA_FIELD,
} from './field.ts';
import moment from 'moment';

export async function getOrder(placementId: number): Promise<OrderData | null> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    let orderData: OrderData = {
      items: [],
    };

    const getProductRowsCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się pobrać produktów oferty. Szczegóły w konsoli');
        reject();
      } else {
        const data = result.data();

        orderData.items = data.map(
          (item: any, idx: number): OrderItem => ({
            id: item['ID'],
            warehouseCode:
              orderData.additionalData?.warehouseCodes?.[idx] ?? '',
            productName: item['PRODUCT_NAME'],
            quantity: item['QUANTITY'],
            unit: item['MEASURE_NAME'],
            unitPrice: item['PRICE'],
          }),
        );

        orderData.packagingData = orderData.items.reduce(
          (acc: PackagingData, item) => {
            if (item.id) {
              if (orderData.packagingData?.[item.id]) {
                acc[item.id] = orderData.packagingData[item.id];
              } else {
                acc[item.id] = {
                  itemId: item.id,
                  quality: 1,
                  comment: '',
                  date: moment().format('YYYY-MM-DD'),
                  packerId: 0,
                };
              }
            }

            return acc;
          },
          {},
        );

        resolve(orderData);
      }
    };

    const getEstimateCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się pobrać oferty. Szczegóły w konsoli');
        reject();
      } else {
        const data = result.data();

        let additionalData = {};
        let packagingData = [];

        try {
          additionalData = JSON.parse(data[ORDER_ADDITIONAL_DATA_FIELD]);
        } catch (e) {
          void e;
        }

        try {
          packagingData = JSON.parse(data[ORDER_PACKAGING_DATA_FIELD]);
        } catch (e) {
          void e;
        }

        orderData = {
          dealId: data['DEAL_ID'] ?? undefined,
          leadId: data['LEAD_ID'] ?? undefined,
          buyerNip: data[ORDER_BUYER_NIP_FIELD] ?? undefined,
          companyId: data['COMPANY_ID'] ?? undefined,
          contactId: data['CONTACT_ID'] ?? undefined,
          additionalData: additionalData,
          packagingData: packagingData,
          items: [],
        };

        bx24.callMethod(
          'crm.quote.productrows.get',
          { id: placementId },
          getProductRowsCallback,
        );
      }
    };

    bx24.callMethod('crm.quote.get', { id: placementId }, getEstimateCallback);
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

    const setEstimateCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się zapisać oferty. Szczegóły w konsoli');
        reject();
      } else {
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
      }
    };

    const updateBody = {
      id: placementId,
      fields: {
        [ORDER_ADDITIONAL_DATA_FIELD]: JSON.stringify({
          warehouseCodes: order.map((item) => item.warehouseCode),
        }),
      },
    };

    bx24.callMethod('crm.quote.update', updateBody, setEstimateCallback);
  });
}

export async function updateOrderPackagingData(
  placementId: number,
  packagingData: PackagingData,
) {
  const bx24 = getBitrix24();
  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const setEstimateCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się zapisać oferty. Szczegóły w konsoli');
        reject();
      } else {
        alert('Dane pakowania zapisane pomyślnie');
        resolve(true);
      }
    };

    const updateBody = {
      id: placementId,
      fields: {
        [ORDER_PACKAGING_DATA_FIELD]: JSON.stringify(packagingData),
      },
    };

    bx24.callMethod('crm.quote.update', updateBody, setEstimateCallback);
  });
}
