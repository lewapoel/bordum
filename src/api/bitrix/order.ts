import { getBitrix24, translateEnumField } from '../../utils/bitrix24.ts';
import {
  OrderAdditionalData,
  OrderData,
  OrderItem,
  PackagingData,
  VerificationData,
} from '../../models/bitrix/order.ts';
import { ensureMeasure, getMeasures } from './measure.ts';
import {
  CONNECTIONS,
  ORDER_ADDITIONAL_DATA_FIELD,
  ORDER_DELIVERY_CITY_FIELD,
  ORDER_DELIVERY_HOUSE_NUMBER_FIELD,
  ORDER_DELIVERY_POSTAL_CODE_FIELD,
  ORDER_DELIVERY_STREET_FIELD,
  ORDER_DELIVERY_TYPE_FIELD,
  ORDER_DEPOSIT_DUE_DATE_FIELD,
  ORDER_DEPOSIT_REQUIRED_FIELD,
  ORDER_DOCUMENTS_ID_FIELD,
  ORDER_INSTALLATION_SERVICE_FIELD,
  ORDER_MAIN_LINK_FIELD,
  ORDER_PACKAGING_DATA_FIELD,
  ORDER_PAYMENT_TYPE_FIELD,
  ORDER_PAYMENT_VARIANT_FIELD,
  ORDER_PROFORMA_DOCUMENT_FIELD,
  ORDER_RELEASE_DOCUMENT_FIELD,
  ORDER_VERIFICATION_DATA_FIELD,
  ORDER_VERIFICATION_DOCUMENTS_FIELD,
} from '../../data/bitrix/field.ts';
import moment from 'moment';
import { DocumentType } from '../comarch/document.ts';
import sanitize from 'sanitize-filename';
import { DealData } from '../../models/bitrix/deal.ts';
import { EnumFieldMeta, FieldsMeta } from '../../models/bitrix/field.ts';
import { getDealFields } from './deal.ts';
import { BitrixFile } from '../../models/bitrix/disk.ts';

export async function getOrderFields(): Promise<FieldsMeta | null> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const getFieldsCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się pobrać pól oferty. Szczegóły w konsoli');
        reject();
      } else {
        const data = result.data();
        resolve(data as FieldsMeta);
      }
    };

    bx24.callMethod('crm.quote.fields', {}, getFieldsCallback);
  });
}

export async function getOrder(placementId: number): Promise<OrderData | null> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    let orderData: OrderData = {
      items: [],
      deliveryAddress: {},
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
            taxRate: item['TAX_RATE'] ?? undefined,
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

        const companyId = data['COMPANY_ID'];
        const contactId = data['CONTACT_ID'];

        orderData = {
          id: data['ID'] || undefined,
          dealId: data['DEAL_ID'] || undefined,
          leadId: data['LEAD_ID'] || undefined,
          title: data['TITLE'] || undefined,
          companyId: companyId && companyId !== '0' ? companyId : undefined,
          contactId: contactId && contactId !== '0' ? contactId : undefined,
          additionalData: additionalData,
          packagingData: packagingData,
          verificationData: verificationData,
          deliveryAddress: {
            postalCode: data[ORDER_DELIVERY_POSTAL_CODE_FIELD] || undefined,
            city: data[ORDER_DELIVERY_CITY_FIELD] || undefined,
            street: data[ORDER_DELIVERY_STREET_FIELD] || undefined,
            houseNumber: data[ORDER_DELIVERY_HOUSE_NUMBER_FIELD] || undefined,
          },
          items: [],
          depositRequired: data[ORDER_DEPOSIT_REQUIRED_FIELD] || undefined,
          paymentVariant: data[ORDER_PAYMENT_VARIANT_FIELD] || undefined,
          depositDueDate: data[ORDER_DEPOSIT_DUE_DATE_FIELD] || undefined,
          paymentType: data[ORDER_PAYMENT_TYPE_FIELD] || undefined,
          deliveryType: data[ORDER_DELIVERY_TYPE_FIELD] || undefined,
          installationService:
            data[ORDER_INSTALLATION_SERVICE_FIELD] || undefined,
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

export async function createOrderFromDeal(
  dealId: number,
  dealData: DealData,
): Promise<number | null> {
  const bx24 = getBitrix24();
  if (!bx24) {
    return null;
  }

  const dealFields = await getDealFields();
  const orderFields = await getOrderFields();

  if (!dealFields || !orderFields) {
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

    const {
      DEPOSIT_REQUIRED: depositRequired,
      PAYMENT_VARIANT: paymentVariant,
      DEPOSIT_DUE_DATE: depositDueDate,
      PAYMENT_TYPE: paymentType,
      DELIVERY_TYPE: deliveryType,
      INSTALLATION_SERVICE: installationService,
    } = CONNECTIONS;

    try {
      const updateBody = {
        fields: {
          DEAL_ID: dealId,
          CONTACT_ID: dealData.contactId,
          COMPANY_ID: dealData.companyId,
          [depositRequired.order]: dealData.depositRequired
            ? translateEnumField(
                dealFields[depositRequired.deal] as EnumFieldMeta,
                orderFields[depositRequired.order] as EnumFieldMeta,
                dealData.depositRequired,
              )
            : '',
          [paymentVariant.order]: dealData.paymentVariant
            ? translateEnumField(
                dealFields[paymentVariant.deal] as EnumFieldMeta,
                orderFields[paymentVariant.order] as EnumFieldMeta,
                dealData.paymentVariant,
              )
            : '',
          [depositDueDate.order]: dealData.depositDueDate,
          [paymentType.order]: dealData.paymentType
            ? translateEnumField(
                dealFields[paymentType.deal] as EnumFieldMeta,
                orderFields[paymentType.order] as EnumFieldMeta,
                dealData.paymentType,
              )
            : '',
          [deliveryType.order]: dealData.deliveryType
            ? translateEnumField(
                dealFields[deliveryType.deal] as EnumFieldMeta,
                orderFields[deliveryType.order] as EnumFieldMeta,
                dealData.deliveryType,
              )
            : '',
          [installationService.order]: dealData.installationService
            ? translateEnumField(
                dealFields[installationService.deal] as EnumFieldMeta,
                orderFields[installationService.order] as EnumFieldMeta,
                dealData.installationService,
              )
            : '',
        },
      };

      bx24.callMethod('crm.quote.add', updateBody, addEstimateCallback);
    } catch (error) {
      console.error(error);
      alert('Nie udało się ustalić pól tworzonej oferty. Szczegóły w konsoli');
      reject();
    }
  });
}

/**
 * @property subOrder Suborder items
 * @property order New current order items (optional)
 * @property title Title suffix
 * @property statusId Assigned status ID (optional)
 * @property subStatusId Assigned status ID of suborder (optional)
 */
type SplitOrderParams = {
  subOrder: Array<OrderItem>;
  order?: Array<OrderItem>;
  title: string;
  statusId?: string;
  subStatusId?: string;
};

/**
 * Split order into two or create new suborder without modifying the current one
 * @param placementId Current order ID
 * @param params See {@link SplitOrderParams}
 */
export async function splitOrder(
  placementId: number,
  params: SplitOrderParams,
) {
  const bx24 = getBitrix24();
  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    let estimateData: any;

    const addEstimateCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się utworzyć oferty. Szczegóły w konsoli');
        reject();
      } else {
        updateOrder(result.data(), params.subOrder, {
          ensureMeasures: false,
          showAlertOnSuccess: false,
          title: params.title
            ? `${estimateData.TITLE} - ${params.title}`
            : undefined,
        }).then(() => {
          alert('Oferta podzielona pomyślnie');
          resolve(true);
        });
      }
    };

    const getEstimateCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się pobrać danych oferty. Szczegóły w konsoli');
        reject();
      } else {
        estimateData = result.data();
        const id = estimateData.ID;
        estimateData.TITLE = id;

        delete estimateData.ID; // Not needed for creating new estimate

        const quoteData = {
          fields: {
            ...estimateData,
            [ORDER_MAIN_LINK_FIELD]: `https://bordum.bitrix24.pl/crm/type/7/details/${id}/`,
          },
        };

        if (params.subStatusId) {
          quoteData.fields.STATUS_ID = params.subStatusId;
        }

        // Add new estimate
        bx24.callMethod('crm.quote.add', quoteData, addEstimateCallback);

        if (params.order) {
          void updateOrder(placementId, params.order, {
            ensureMeasures: false,
            showAlertOnSuccess: false,
            statusId: params.statusId,
          });
        }
      }
    };

    bx24.callMethod('crm.quote.get', { id: placementId }, getEstimateCallback);
  });
}

type UpdateOrderParams = {
  ensureMeasures: boolean;
  showAlertOnSuccess?: boolean;
  title?: string;
  statusId?: string;
};

export async function updateOrder(
  placementId: number,
  order: Array<OrderItem>,
  {
    ensureMeasures,
    showAlertOnSuccess = true,
    title,
    statusId,
  }: UpdateOrderParams,
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
                  TAX_RATE: item.taxRate,
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

    const updateBody: any = {
      id: placementId,
      fields: {
        [ORDER_ADDITIONAL_DATA_FIELD]: JSON.stringify(additionalData),
      },
    };

    if (title) {
      updateBody.fields.TITLE = title;
    }

    if (statusId) {
      updateBody.fields.STATUS_ID = statusId;
    }

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

    let fieldId: string | null = null;

    switch (documentType) {
      case DocumentType.RELEASE_DOCUMENT:
        fieldId = ORDER_RELEASE_DOCUMENT_FIELD;
        break;

      case DocumentType.PROFORMA_DOCUMENT:
        fieldId = ORDER_PROFORMA_DOCUMENT_FIELD;
        break;
    }

    if (!fieldId) {
      console.error('Nieprawidłowy rodzaj dokumentu');
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
        [ORDER_VERIFICATION_DOCUMENTS_FIELD]: files.map((file) => ({
          fileData: file,
        })),
      },
    };

    bx24.callMethod('crm.quote.update', updateBody, setEstimateCallback);
  });
}
