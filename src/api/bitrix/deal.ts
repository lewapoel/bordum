import { getBitrix24 } from '../../utils/bitrix24.ts';
import { DealData, ReturnData } from '../../models/bitrix/deal.ts';
import {
  DEAL_DELIVERY_TYPE_FIELD,
  DEAL_DEPOSIT_DUE_DATE_FIELD,
  DEAL_DEPOSIT_REQUIRED_FIELD,
  DEAL_INSTALLATION_SERVICE_FIELD,
  DEAL_PAYMENT_TYPE_FIELD,
  DEAL_PAYMENT_VARIANT_FIELD,
  DEAL_RETURN_DATA_FIELD,
} from '../../data/bitrix/field.ts';
import { EnumFieldMeta, FieldsMeta } from '../../models/bitrix/field.ts';

export async function getDealFields(): Promise<FieldsMeta | null> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const getFieldsCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się pobrać pól deala. Szczegóły w konsoli');
        reject();
      } else {
        const data = result.data() as FieldsMeta;
        Object.entries(data).forEach(([key, value]) => {
          if (value.type === 'enumeration') {
            data[key] = value as EnumFieldMeta;
          }
        });

        resolve(data);
      }
    };

    bx24.callMethod('crm.deal.fields', {}, getFieldsCallback);
  });
}

export async function getDeal(placementId: number): Promise<DealData | null> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const getDealCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się pobrać deala. Szczegóły w konsoli');
        reject();
      } else {
        const data = result.data();

        let returnData = {};

        try {
          returnData = JSON.parse(data[DEAL_RETURN_DATA_FIELD]);
        } catch (e) {
          void e;
        }

        const companyId = data['COMPANY_ID'];
        const contactId = data['CONTACT_ID'];

        resolve({
          id: data['ID'] || undefined,
          returnData: returnData,
          companyId: companyId && companyId !== '0' ? companyId : undefined,
          contactId: contactId && contactId !== '0' ? contactId : undefined,
          depositRequired: data[DEAL_DEPOSIT_REQUIRED_FIELD] || undefined,
          paymentVariant: data[DEAL_PAYMENT_VARIANT_FIELD] || undefined,
          depositDueDate: data[DEAL_DEPOSIT_DUE_DATE_FIELD] || undefined,
          paymentType: data[DEAL_PAYMENT_TYPE_FIELD] || undefined,
          deliveryType: data[DEAL_DELIVERY_TYPE_FIELD] || undefined,
          installationService:
            data[DEAL_INSTALLATION_SERVICE_FIELD] || undefined,
        });
      }
    };

    bx24.callMethod('crm.deal.get', { id: placementId }, getDealCallback);
  });
}

export async function updateDealReturnData(
  placementId: number,
  returnData: ReturnData,
) {
  const bx24 = getBitrix24();
  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const setDealCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się zapisać deala. Szczegóły w konsoli');
        reject();
      } else {
        alert('Dane zwrotu zapisane pomyślnie');
        resolve(true);
      }
    };

    const updateBody = {
      id: placementId,
      fields: {
        [DEAL_RETURN_DATA_FIELD]: JSON.stringify(returnData),
      },
    };

    bx24.callMethod('crm.deal.update', updateBody, setDealCallback);
  });
}
