import { API_URL } from './const.ts';
import { useMutation, useQuery } from '@tanstack/react-query';
import { OrderData } from '../../models/bitrix/order.ts';
import { getCompany } from '../bitrix/company.ts';
import { getContact } from '../bitrix/contact.ts';
import { getOrderDocuments, updateOrderDocument } from '../bitrix/order.ts';
import { getDeal, updateDealReturnData } from '../bitrix/deal.ts';
import moment from 'moment/moment';

export type AddDocument = {
  placementId: number;
  order: OrderData;
  documentType: DocumentType;
  exportDocument?: boolean;
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
          code: company.nip ?? company.title,
          vatNumber: company.nip,
          name1: company.title,
          email: company.email,
          phone1: company.phone,
        };
      } else if (contact) {
        buyer = {
          code: `${contact.name} ${contact.lastName}`,
          name1: `${contact.name} ${contact.lastName}`,
          email: contact.email,
          phone1: contact.phone,
        };
      }

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
        calculatedOn: 1,
        paymentMethod: 'przelew',
        currency: 'PLN',
        elements: order.items.map((item) => ({
          code: item.warehouseCode,
          quantity: item.quantity,
          totalNetValue: item.unitPrice * item.quantity,
          setCustomValue: true,
        })),
        recipient: buyer,
        status: 1,
        sourceWarehouseId: 1,
        description: order.id,
      };

      if (documentType === DocumentType.RESERVATION_DOCUMENT) {
        body.foreignNumber = order.title;
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
    },
    onSuccess: () => alert('Utworzono dokument pomyślnie'),
    onError: (error) => {
      if (error.message.includes('The code field is required')) {
        alert(
          'Brakujące dane kodów magazynowych, dodaj wszystkie produkty od nowa',
        );
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

export type ReleaseDocument = {
  id: number;
  fullNumber: string;
  recipientVAT: string;
  recipientName: string;
  description: string;
};

export function useGetReleaseDocuments(token: string) {
  return useQuery({
    // eslint-disable-next-line
    queryKey: ['release-documents'],
    queryFn: () =>
      fetch(`${API_URL}/Documents?type=306`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (response): Promise<Array<ReleaseDocument>> => {
          const data = await response.json();
          let releaseDocuments: Array<ReleaseDocument> = data;

          if (!Array.isArray(data)) {
            releaseDocuments = [data];
          }

          return releaseDocuments.map(
            (document: any): ReleaseDocument => ({
              id: +document['id'],
              description: document['description'],
              fullNumber: document['fullNumber'],
              recipientName: `${document['recipient']['name1']} (${document['recipient']['name2']})`,
              recipientVAT: document['recipient']['vatNumber'],
            }),
          );
        })
        .catch((error) => {
          console.error(error);
          alert('Nie udało się pobrać dokumentów WZ');
          return null;
        }),
    enabled: !!token,
  });
}
