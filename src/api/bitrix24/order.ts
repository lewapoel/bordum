import { getBitrix24 } from '../../utils/bitrix24.ts';
import {
  OrderAdditionalData,
  OrderData,
  OrderItem,
  PackagingData,
  VerificationData,
} from '../../models/bitrix/order.ts';
import { ensureMeasure, getMeasures } from './measure.ts';
import {
  ORDER_ADDITIONAL_DATA_FIELD,
  ORDER_DOCUMENTS_ID_FIELD,
  ORDER_PACKAGING_DATA_FIELD,
  ORDER_PROFORMA_DOCUMENT_FIELD,
  ORDER_RELEASE_DOCUMENT_FIELD,
  ORDER_VERIFICATION_DATA_FIELD,
  ORDER_VERIFICATION_DOCUMENTS_FIELD,
} from './field.ts';
import moment from 'moment';
import { DocumentType } from '../comarch/document.ts';
import sanitize from 'sanitize-filename';
import { BitrixFile } from '../../models/bitrix/file.ts';

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
            groupId: orderData.additionalData?.groupIds?.[idx] ?? '',
            itemId: orderData.additionalData?.itemIds?.[idx] ?? '',
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

        orderData.verificationData = orderData.items.reduce(
          (acc: VerificationData, item) => {
            if (item.id) {
              if (orderData.verificationData?.[item.id]) {
                acc[item.id] = orderData.verificationData[item.id];
              } else {
                acc[item.id] = {
                  itemId: item.id,
                  actualStock: 0,
                  qualityGoods: 0,
                  comment: '',
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
        let packagingData = {};
        let verificationData = {};

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

        try {
          verificationData = JSON.parse(data[ORDER_VERIFICATION_DATA_FIELD]);
        } catch (e) {
          void e;
        }

        orderData = {
          id: data['ID'] || undefined,
          dealId: data['DEAL_ID'] || undefined,
          leadId: data['LEAD_ID'] || undefined,
          companyId: data['COMPANY_ID'] || undefined,
          contactId: data['CONTACT_ID'] || undefined,
          additionalData: additionalData,
          packagingData: packagingData,
          verificationData: verificationData,
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

export async function hasOrderDeals(placementId: number): Promise<boolean> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return false;
  }

  return new Promise((resolve, reject) => {
    const getDeals = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się pobrać deali podanej oferty. Szczegóły w konsoli');
        reject();
      } else {
        const data = result.data();

        resolve(data.length > 0);
      }
    };

    bx24.callMethod(
      'crm.deal.list',
      { filter: { QUOTE_ID: placementId } },
      getDeals,
    );
  });
}

export async function createOrder(
  dealId: number,
  contactId?: number,
  companyId?: number,
): Promise<number | null> {
  const bx24 = getBitrix24();
  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const addEstimateCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się utworzyć oferty. Szczegóły w konsoli');
        reject();
      } else {
        resolve(result.data());
      }
    };

    const updateBody = {
      fields: {
        DEAL_ID: dealId,
        CONTACT_ID: contactId,
        COMPANY_ID: companyId,
      },
    };

    bx24.callMethod('crm.quote.add', updateBody, addEstimateCallback);
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

    const additionalData: OrderAdditionalData = {
      warehouseCodes: order.map((item) => item.warehouseCode),
      itemIds: order.map((item) => item.itemId),
      groupIds: order.map((item) => item.groupId),
    };

    const updateBody = {
      id: placementId,
      fields: {
        [ORDER_ADDITIONAL_DATA_FIELD]: JSON.stringify(additionalData),
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

export async function updateOrderVerificationData(
  placementId: number,
  verificationData: VerificationData,
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
        alert('Dane weryfikacji stanu zapisane pomyślnie');
        resolve(true);
      }
    };

    const updateBody = {
      id: placementId,
      fields: {
        [ORDER_VERIFICATION_DATA_FIELD]: JSON.stringify(verificationData),
      },
    };

    bx24.callMethod('crm.quote.update', updateBody, setEstimateCallback);
  });
}

// Document type -> Created document ID
export type OrderDocuments = { [key: string]: string };

export async function getOrderDocuments(
  placementId: number,
): Promise<OrderDocuments | null> {
  const bx24 = getBitrix24();
  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const getEstimateCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        reject();
      } else {
        const data = result.data();

        let orderDocuments = {};

        try {
          orderDocuments = JSON.parse(data[ORDER_DOCUMENTS_ID_FIELD]);
        } catch (e) {
          void e;
        }

        resolve(orderDocuments);
      }
    };

    bx24.callMethod(
      'crm.quote.get',
      {
        id: placementId,
      },
      getEstimateCallback,
    );
  });
}

export async function updateOrderDocument(
  placementId: number,
  documentType: DocumentType,
  orderDocuments: OrderDocuments,
  documentId: string,
  documentFullNumber: string,
  documentData: string,
) {
  const bx24 = getBitrix24();
  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const setEstimateCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        reject();
      } else {
        resolve(true);
      }
    };

    let fieldId: string;

    switch (documentType) {
      case DocumentType.RELEASE_DOCUMENT:
        fieldId = ORDER_RELEASE_DOCUMENT_FIELD;
        break;

      case DocumentType.PROFORMA_DOCUMENT:
        fieldId = ORDER_PROFORMA_DOCUMENT_FIELD;
        break;
    }

    if (!fieldId) {
      console.error('Invalid order document type provided');
      reject();
      return;
    }

    const updateBody = {
      id: placementId,
      fields: {
        [fieldId]: {
          fileData: [
            `Dokument-${sanitize(documentFullNumber.replaceAll('/', '_'))}.pdf`,
            documentData,
          ],
        },
        [ORDER_DOCUMENTS_ID_FIELD]: JSON.stringify({
          ...orderDocuments,
          [documentType.valueOf()]: documentId,
        }),
      },
    };

    bx24.callMethod('crm.quote.update', updateBody, setEstimateCallback);
  });
}

export async function updateOrderVerificationDocuments(
  placementId: number,
  files: Array<BitrixFile>,
) {
  const bx24 = getBitrix24();
  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const setEstimateCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        reject();
      } else {
        resolve(true);
      }
    };

    const updateBody = {
      id: placementId,
      fields: {
        [ORDER_VERIFICATION_DOCUMENTS_FIELD]: {
          fileData: files,
        },
      },
    };

    bx24.callMethod('crm.quote.update', updateBody, setEstimateCallback);
  });
}
