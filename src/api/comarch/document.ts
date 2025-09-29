import { API_URL } from './const.ts';
import { useMutation } from '@tanstack/react-query';
import { OrderData } from '@/models/bitrix/order.ts';
import { getCompany } from '../bitrix/company.ts';
import { getContact } from '../bitrix/contact.ts';
import { getOrderDocuments, updateOrderDocument } from '../bitrix/order.ts';
import { getDeal, updateDealReturnData } from '../bitrix/deal.ts';
import moment from 'moment/moment';
import { getCompanyCode, getContactCode } from '@/utils/bitrix24.ts';
import { calculateUnitPrice } from '@/utils/item.ts';

export type AddDocument = {
  placementId: number;
  order: OrderData;
  documentType: DocumentType;
  exportDocument?: boolean;
  silentSuccess?: boolean;
};

export enum DocumentType {
  RELEASE_DOCUMENT = 306,
  RESERVATION_DOCUMENT = 308,
  PROFORMA_DOCUMENT = 320,
}

export function useAddDocument(token: string) {
  return useMutation({
    mutationKey: ['add-document'],
    mutationFn: async ({
      order,
      placementId,
      documentType,
      exportDocument = true,
      silentSuccess = false,
    }: AddDocument) => {
      if (!order.companyId && !order.contactId) {
        throw new Error('MISSING_BUYER_ID');
      }

      let company;
      let contact;

      if (order.companyId) {
        company = await getCompany(order.companyId);
      } else if (order.contactId) {
        contact = await getContact(order.contactId);
      }

      if (!company && !contact) {
        throw new Error('MISSING_DATA');
      }

      const address = order.deliveryAddress;

      const orderDocuments = await getOrderDocuments(placementId);
      if (!orderDocuments) {
        throw new Error('MISSING_ORDER_DOCUMENTS');
      }

      let buyer;
      if (company) {
        buyer = {
          code: getCompanyCode(company),
          vatNumber: company.nip,
          name1: company.title,
          email: company.email,
          phone1: company.phone,
        };
      } else if (contact) {
        buyer = {
          code: getContactCode(contact),
          name1: `${contact.name} ${contact.lastName}`,
          email: contact.email,
          phone1: contact.phone,
        };
      }

      const buyerNoAddress = buyer;

      buyer = {
        ...buyer,
        city: address.city,
        street: address.street,
        postCode: address.postalCode,
        houseNumber: address.houseNumber,
      };

      /**
       * Deleting documents is supported only for release documents (API bug/limitation)
       */
      if (
        documentType === DocumentType.RELEASE_DOCUMENT &&
        orderDocuments[documentType]
      ) {
        const response = await fetch(
          `${API_URL}/Documents?type=${documentType}&id=${orderDocuments[documentType]}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error);
        }
      }

      const body: any = {
        type: documentType,
        calculatedOn: 2,
        paymentMethod: 'przelew',
        currency: 'PLN',
        elements: order.items.map((item) => ({
          code: item.code,
          quantity: item.quantity,
          totalGrossValue: calculateUnitPrice(item) * item.quantity,
          setCustomValue: true,
        })),
        payer: buyerNoAddress,
        recipient: buyer,
        status: 1,
        sourceWarehouseId: 1,
      };

      if (order.deliveryDate) {
        body.documentReleaseDate = order.deliveryDate;
      }

      if (documentType === DocumentType.RESERVATION_DOCUMENT) {
        body.foreignNumber = order.title;
        body.description = order.id;
      } else {
        body.description = `Towar wydany z oferty: ${order.id}`;
      }

      let response = await fetch(`${API_URL}/Documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const data = await response.json();
      const documentId = data['id'];
      const documentFullNumber = data['fullNumber'];

      if (exportDocument) {
        response = await fetch(`${API_URL}/DocumentsExport?id=${documentId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const fileBuffer = await response.arrayBuffer();
        const fileData = Buffer.from(fileBuffer).toString('base64');

        await updateOrderDocument(
          placementId,
          documentType,
          orderDocuments,
          documentId,
          documentFullNumber,
          fileData,
        );
      }

      // Add order return data if release document from a deal
      if (documentType === DocumentType.RELEASE_DOCUMENT && order.dealId) {
        const deal = await getDeal(order.dealId);
        if (deal) {
          const returnData = deal.returnData ?? {};
          order.items.forEach((item) => {
            if (item.id) {
              returnData[item.id] = {
                releaseDocument: documentFullNumber,
                item: item,
                returnQuantity: 0,
                date: moment().format('YYYY-MM-DD'),
                reason: '',
                images: [],
              };
            }
          });

          await updateDealReturnData(order.dealId, returnData, false);
        }
      }

      return { silentSuccess };
    },
    onSuccess: (data) => {
      if (!data?.silentSuccess) {
        alert('Utworzono dokument pomyślnie');
      }
    },
    onError: (error) => {
      if (error.message.includes('The code field is required')) {
        alert(
          'Brakujące dane kodów magazynowych, dodaj wszystkie produkty od nowa',
        );
      } else if (error.message.includes('Incorrect TIN')) {
        alert('NIP podmiotu jest nieprawidłowy');
      } else if (error.message === 'MISSING_BUYER_ID') {
        alert('Brakujące dane nabywcy');
      } else if (error.message === 'MISSING_DATA') {
        alert('Nie udało się pobrać danych nabywcy');
      } else if (error.message === 'MISSING_ORDER_DOCUMENTS') {
        alert('Nieprawidłowe dane dokumentów oferty');
      } else if (error.message.includes('shortage')) {
        alert(
          'W ofercie znajdują się produkty, których ilość przekracza dostępny stan magazynowy',
        );
      } else {
        console.error(error.message);
        alert('Wystąpił błąd przy dodawaniu dokumentu. Sprawdź konsolę');
      }
    },
  });
}
