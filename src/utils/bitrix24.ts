import { isDev } from './dev.ts';
import {
  CRM_ADDRESS_LIST,
  CRM_COMPANY_GET,
  CRM_CONTACT_GET,
  CRM_DEAL_FIELDS,
  CRM_DEAL_GET,
  CRM_MEASURE_LIST,
  CRM_QUOTE_FIELDS,
  CRM_QUOTE_GET,
  CRM_QUOTE_PRODUCTROWS_GET,
  USER_CURRENT,
  USER_GET,
} from '../data/bitrix/mockBitrix.ts';
import { EnumFieldMeta } from '../models/bitrix/field.ts';

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

      case 'crm.quote.fields':
        data = CRM_QUOTE_FIELDS;
        break;

      case 'crm.deal.fields':
        data = CRM_DEAL_FIELDS;
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

/**
 * Translates an enum field between types (ex. from deal to quote). \
 * This is necessary because custom fields cannot be shared between types
 * (deals cannot have same custom fields as quotes). \
 * The value stored in a custom enum field is it's ID which
 * can be translated to it's text value using the `crm.[type].fields` endpoint
 * @param sourceField Meta of the custom field in the source type
 * @param destField Meta of the custom field in the destination type
 * @param field Fields' ID retrieved from the source type
 * @returns Fields' ID translated from the source to the destination type
 */
export function translateEnumField(
  sourceField: EnumFieldMeta,
  destField: EnumFieldMeta,
  field: string,
): string {
  const text = sourceField.items.find((item) => item.ID === field)?.VALUE;
  if (!text) {
    throw new Error(
      `Cannot translate, ${field} ID doesn't exist in the source field items`,
    );
  }

  const id = destField.items.find(
    (item) => item.VALUE.toLowerCase().trim() === text.toLowerCase().trim(),
  )?.ID;
  if (!id) {
    throw new Error(
      `Cannot translate, ${text} text doesn't exist in the destination field items`,
    );
  }

  return id;
}
