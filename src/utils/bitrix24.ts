import { isDev } from './dev.ts';
import {
  CRM_ADDRESS_LIST,
  CRM_COMPANY_GET,
  CRM_CONTACT_GET,
  CRM_DEAL_FIELDS,
  CRM_DEAL_GET,
  CRM_ITEM_FIELDS,
  CRM_ITEM_GET,
  CRM_ITEM_LIST,
  CRM_MEASURE_LIST,
  CRM_QUOTE_FIELDS,
  CRM_QUOTE_GET,
  CRM_QUOTE_PRODUCTROWS_GET,
  USER_CURRENT,
  USER_GET,
} from '../data/bitrix/mockBitrix.ts';
import {
  EnumFieldMeta,
  FieldMeta,
  FieldsMeta,
} from '../models/bitrix/field.ts';
import { ORDER_VERIFICATION_DOCUMENTS_FIELD } from '../data/bitrix/field.ts';
import { downloadBase64File } from './file.ts';
import { Company } from '../models/bitrix/company.ts';
import _ from 'lodash';
import { Contact } from '../models/bitrix/contact.ts';

type MockBitrixResult = {
  error: () => any;
  data: () => any;
};

export async function fetchDiskApi(method: string, data: any) {
  return fetch(`${import.meta.env.VITE_BITRIX_DISK_API}/${method}.json`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

const mockBX24 = {
  appOption: {
    get: () => {},
    set: () => {},
  },
  callMethod: (
    method: string,
    _args: any,
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

      case 'crm.quote.update': {
        const verificationDocuments =
          _args?.fields?.[ORDER_VERIFICATION_DOCUMENTS_FIELD];

        if (verificationDocuments && verificationDocuments.length > 0) {
          verificationDocuments.forEach((verificationDocument: any) => {
            downloadBase64File(
              verificationDocument.fileData[0],
              'pdf',
              verificationDocument.fileData[1],
            );
          });
        }
        break;
      }

      case 'crm.item.list':
        data = CRM_ITEM_LIST;
        break;

      case 'crm.item.get':
        data = CRM_ITEM_GET;
        break;

      case 'crm.item.fields':
        data = CRM_ITEM_FIELDS;
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
    return 6096;
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

export function getCurrentPlacement() {
  if (isDev()) {
    return 'CRM_COMPANY_DETAIL_TAB';
  }

  const bx24 = getBitrix24();

  // Error alert is shown in `getBitrix24`
  if (!bx24) {
    return null;
  }

  const placement = bx24.placement?.info?.()?.placement;
  if (!placement) {
    return null;
  }

  return placement;
}

export function getEnumValue(field: EnumFieldMeta, id?: string) {
  return field?.items?.find?.((item) => item.ID === id?.toString?.())?.VALUE;
}

export type MatchedCustomField = {
  source: FieldMeta;
  destination: FieldMeta;
};

/**
 * Finds matching fields between two entities (ex. quote and deal), using their labels
 * @param source Fields of source
 * @param destination Fields of destination
 * @returns Matched fields between both sources
 */
export function findMatchingCustomFields(
  source: FieldsMeta,
  destination: FieldsMeta,
): Array<MatchedCustomField> {
  // Filter out non-custom fields and set the key to the label
  const mapCustomFieldsByLabel = (fields: FieldsMeta) =>
    Object.values(fields).reduce((acc: FieldsMeta, field) => {
      // If formLabel not present, then it's not a custom field
      if (field.formLabel) {
        acc[field.formLabel.toLowerCase().trim()] = field;
      }

      return acc;
    }, {});

  const sourceByLabels = mapCustomFieldsByLabel(source);
  const destinationByLabels = mapCustomFieldsByLabel(destination);

  const result: Array<MatchedCustomField> = [];

  Object.entries(sourceByLabels).forEach(([key, field]) => {
    if (
      key in destinationByLabels &&
      destinationByLabels[key].type === field.type
    ) {
      result.push({
        source: field,
        destination: destinationByLabels[key],
      });
    }
  });

  return result;
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
  if (!field || !field.length) {
    return field;
  }

  const text = getEnumValue(sourceField, field);
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

export type FieldsValues = { [key: string]: any };

/**
 * Translates fields between types (ex. from deal to quote). \
 * This is necessary because custom fields cannot be shared between types
 * (deals cannot have same custom fields as quotes).
 * @param matchedFields Matched fields between types
 * @param values Values from the source
 * @returns Translated fields values
 */
export function translateFields(
  matchedFields: Array<MatchedCustomField>,
  values: FieldsValues,
): FieldsValues {
  const result: FieldsValues = {};

  matchedFields.forEach((field) => {
    const sourceField = field.source;
    const destField = field.destination;

    if (sourceField.title in values) {
      let resultValue: any;

      switch (sourceField.type) {
        case 'enumeration':
          resultValue = translateEnumField(
            sourceField as EnumFieldMeta,
            destField as EnumFieldMeta,
            values[sourceField.title],
          );
          break;

        default:
          resultValue = values[sourceField.title];
          break;
      }

      result[destField.title] = resultValue;
    }
  });

  return result;
}

export function getCompanyCode(company: Company): string {
  return company.nip ?? _.deburr(company.title);
}

export function getContactCode(contact: Contact): string {
  return _.deburr(`${contact.name} ${contact.lastName}`);
}
