import { isDev } from './dev.ts';
import {
  CRM_ADDRESS_LIST,
  CRM_COMPANY_GET,
  CRM_CONTACT_GET,
  CRM_DEAL_GET,
  CRM_MEASURE_LIST,
  CRM_QUOTE_GET,
  CRM_QUOTE_PRODUCTROWS_GET,
  USER_CURRENT,
  USER_GET,
} from '../data/mockBitrix.ts';

type MockBitrixResult = {
  error: () => any;
  data: () => any;
};

const mockBX24 = {
  callMethod: (
    method: string,
    _args: object,
    callback: (result: MockBitrixResult) => void,
  ) => {
    let isError = false;
    let data = null;

    switch (method) {
      case 'crm.measure.list':
        data = CRM_MEASURE_LIST;
        break;

      case 'crm.quote.add':
      case 'crm.measure.add':
        data = 1;
        break;

      case 'crm.quote.productrows.get':
        data = CRM_QUOTE_PRODUCTROWS_GET;
        break;

      case 'crm.quote.productrows.set':
      case 'crm.quote.get':
        data = CRM_QUOTE_GET;
        break;

      case 'crm.company.get':
        data = CRM_COMPANY_GET;
        break;

      case 'crm.contact.get':
        data = CRM_CONTACT_GET;
        break;

      case 'crm.address.list':
        data = CRM_ADDRESS_LIST;
        break;

      case 'user.get':
        data = USER_GET;
        break;

      case 'user.current':
        data = USER_CURRENT;
        break;

      case 'crm.deal.get':
        data = CRM_DEAL_GET;
        break;

      default:
        isError = true;
        data = null;
        break;
    }

    callback({
      error: () => (isError ? data : null),
      data: () => (isError ? null : data),
    });
  },
};

export function getBitrix24() {
  if (isDev()) {
    return mockBX24;
  }

  // @ts-ignore
  if (!window.BX24) {
    alert('Brak dostępnego API Bitrix24');
    return null;
  }

  // @ts-ignore
  return window.BX24;
}

export function getCurrentPlacementId() {
  if (isDev()) {
    return 1;
  }

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
