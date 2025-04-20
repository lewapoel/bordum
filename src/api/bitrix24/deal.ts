import { getBitrix24 } from '../../utils/bitrix24.ts';
import { DealData } from '../../models/bitrix/deal.ts';
import {
  DEAL_DELIVERY_TYPE_FIELD,
  DEAL_DEPOSIT_DUE_DATE_FIELD,
  DEAL_DEPOSIT_REQUIRED_FIELD,
  DEAL_INSTALLATION_SERVICE_FIELD,
  DEAL_PAYMENT_TYPE_FIELD,
  DEAL_PAYMENT_VARIANT_FIELD,
} from './field.ts';

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

        resolve({
          id: data['ID'] || undefined,
          companyId: data['COMPANY_ID'] || undefined,
          contactId: data['CONTACT_ID'] || undefined,
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
