import { getBitrix24 } from '@/utils/bitrix24.ts';
import { DealData, ReturnData } from '@/models/bitrix/deal.ts';
import {
  DEAL_ESTIMATION_FIELD,
  DEAL_PAYMENT_TYPE_FIELD,
  DEAL_RETURN_DATA_FIELD,
} from '@/data/bitrix/field.ts';
import { FieldsMeta } from '@/models/bitrix/field.ts';
import { DEAL_CATEGORIES } from '@/data/bitrix/const.ts';

export async function getDealFields(): Promise<FieldsMeta | null> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const getFieldsCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert(
          `Nie udało się pobrać pól deala. Szczegóły: ${result.error()?.ex?.error_description}`,
        );
        reject();
      } else {
        const data = result.data();
        resolve(data as FieldsMeta);
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
        alert(
          `Nie udało się pobrać deala. Szczegóły: ${result.error()?.ex?.error_description}`,
        );
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
          title: data['TITLE'] || undefined,
          returnData: returnData,
          companyId: companyId && companyId !== '0' ? companyId : undefined,
          contactId: contactId && contactId !== '0' ? contactId : undefined,
          paymentType: data[DEAL_PAYMENT_TYPE_FIELD] || undefined,
        });
      }
    };

    bx24.callMethod('crm.deal.get', { id: placementId }, getDealCallback);
  });
}

export async function getDealOrders(
  placementId: number,
): Promise<number | null> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const getOrdersCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się pobrać liczby ofert. Szczegóły w konsoli');
        reject();
      } else {
        const data = result.data();
        resolve(data?.length ?? 0);
      }
    };

    bx24.callMethod(
      'crm.quote.list',
      { filter: { DEAL_ID: placementId } },
      getOrdersCallback,
    );
  });
}

export async function getDealRaw(placementId: number): Promise<any | null> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const getDealCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert(
          `Nie udało się pobrać deala. Szczegóły: ${result.error()?.ex?.error_description}`,
        );
        reject();
      } else {
        const data = result.data();
        resolve(data);
      }
    };

    bx24.callMethod('crm.deal.get', { id: placementId }, getDealCallback);
  });
}

export async function updateDealReturnData(
  placementId: number,
  returnData: ReturnData,
  alertOnSuccess: boolean = true,
) {
  const bx24 = getBitrix24();
  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const setDealCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert(
          `Nie udało się zapisać deala. Szczegóły: ${result.error()?.ex?.error_description}`,
        );
        reject();
      } else {
        if (alertOnSuccess) {
          alert('Dane zwrotu zapisane pomyślnie');
        }
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

export async function updateDealEstimate(placementId: number, value: number) {
  const bx24 = getBitrix24();
  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const setDealCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert(
          `Nie udało się zapisać deala. Szczegóły: ${result.error()?.ex?.error_description}`,
        );
        reject();
      } else {
        alert('Wycena zapisana pomyślnie');
        resolve(true);
      }
    };

    const updateBody = {
      id: placementId,
      fields: {
        [DEAL_ESTIMATION_FIELD]: value,
      },
    };

    bx24.callMethod('crm.deal.update', updateBody, setDealCallback);
  });
}

export async function createDeal(): Promise<number | null> {
  const bx24 = getBitrix24();
  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const addDealCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert(
          `Nie udało się utworzyć deala. Szczegóły: ${result.error()?.ex?.error_description}`,
        );
        reject();
      } else {
        resolve(result.data());
      }
    };

    bx24.callMethod(
      'crm.deal.add',
      { fields: { CATEGORY_ID: DEAL_CATEGORIES.PRODUCT_SALES } },
      addDealCallback,
    );
  });
}

export async function openDeal(dealId: number) {
  const bx24 = getBitrix24();
  if (!bx24) {
    return;
  }

  return await new Promise<void>((resolve) => {
    bx24.openPath(`/crm/deal/details/${dealId}/`, () => resolve());
  });
}
