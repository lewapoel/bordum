import {
  getBitrix24,
  getCompanyCode,
  getContactCode,
} from '../../utils/bitrix24.ts';
import { SETTLEMENT_PAYMENT_LEFT_FIELD } from '../../data/bitrix/field.ts';
import { SettlementData, Settlements } from '../../models/bitrix/settlement.ts';
import { ENTITY_TYPES, SETTLEMENT_STAGES } from '../../data/bitrix/const.ts';
import { getCompany } from './company.ts';
import { getContact } from './contact.ts';

export async function getDueSettlements(): Promise<Settlements | null> {
  const bx24 = getBitrix24();

  if (!bx24) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const getSettlementsCallback = async (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert('Nie udało się pobrać listy rozliczeń. Szczegóły w konsoli');
        reject();
      } else {
        const data = result.data();
        const settlements: Settlements = {};

        for (const item of data['items']) {
          const companyId = item['companyId'];
          const contactId = item['contactId'];

          let company;
          let contact;

          if (companyId) {
            company = await getCompany(companyId);
          } else if (contactId) {
            contact = await getContact(companyId);
          }

          if (!company && !contact) {
            continue;
          }

          let code;
          if (company) {
            code = getCompanyCode(company);
          } else if (contact) {
            code = getContactCode(contact);
          } else {
            continue;
          }

          const settlement: SettlementData = {
            id: item['id'],
            opportunity: item['opportunity'],
            categoryId: item['categoryId'],
            companyId: companyId && companyId !== 0 ? companyId : undefined,
            contactId: contactId && contactId !== 0 ? contactId : undefined,
            paymentLeft: item[SETTLEMENT_PAYMENT_LEFT_FIELD] ?? undefined,
          };

          if (!settlements[code]) {
            settlements[code] = [settlement];
          } else {
            settlements[code].push(settlement);
          }
        }

        resolve(settlements);
      }
    };

    bx24.callMethod(
      'crm.item.list',
      {
        entityTypeId: ENTITY_TYPES.SETTLEMENT,
        filter: {
          '@stageId': [
            SETTLEMENT_STAGES.NO_INVOICE.PAYMENT_DUE,
            SETTLEMENT_STAGES.NO_INVOICE.ACCEPT_CASH_PAYMENT,
            SETTLEMENT_STAGES.INVOICE.PAYMENT_DUE,
            SETTLEMENT_STAGES.INVOICE.AWAITING_PAYMENT,
          ],
        },
      },
      getSettlementsCallback,
    );
  });
}
