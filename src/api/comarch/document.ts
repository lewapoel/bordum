import { API_URL } from './const.ts';
import { useMutation, useQuery } from '@tanstack/react-query';
import { OrderData } from '../../models/bitrix/order.ts';
import { getCompany } from '../bitrix24/company.ts';
import { getContact } from '../bitrix24/contact.ts';
import { getAddress } from '../bitrix24/address.ts';
import { BitrixType } from '../../models/bitrix/type.ts';
import {
  getOrderReleaseDocument,
  updateOrderReleaseDocument,
} from '../bitrix24/order.ts';

export type AddReleaseDocument = {
  placementId: number;
  order: OrderData;
};

export function useAddReleaseDocument(token: string) {
  return useMutation({
    mutationKey: ['add-release-document'],
    mutationFn: async ({ order, placementId }: AddReleaseDocument) => {
      if (!order.companyId || !order.contactId) {
        throw new Error('MISSING_BUYER_ID');
      }

      if (!order.buyerNip) {
        throw new Error('MISSING_NIP');
      }

      const company = await getCompany(order.companyId);
      const contact = await getContact(order.contactId);

      if (!company || !contact) {
        throw new Error('MISSING_DATA');
      }

      const contactAddress = await getAddress(
        BitrixType.CONTACT,
        order.contactId,
      );
      if (!contactAddress) {
        throw new Error('MISSING_ADDRESS');
      }

      const buyer = {
        code: order.buyerNip,
        name1: company.title,
        name2: `${contact.name} ${contact.lastName}`,
        email: contact.email,
        city: contactAddress.address1,
        street: contactAddress.address2,
        phone1: contact.phone,
      };

      const oldReleaseDocumentId = await getOrderReleaseDocument(placementId);
      if (oldReleaseDocumentId && +oldReleaseDocumentId) {
        let response = await fetch(
          `${API_URL}/Documents?type=306&id=${oldReleaseDocumentId}`,
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

      let response = await fetch(`${API_URL}/Documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 306,
          calculatedOn: 1,
          paymentMethod: 'przelew',
          currency: 'PLN',
          elements: order.items.map((item) => ({
            code: item.warehouseCode,
            quantity: item.quantity,
            totalNetValue: item.unitPrice * item.quantity,
            setCustomValue: true,
          })),
          payer: buyer,
          recipient: buyer,
          status: 1,
          sourceWarehouseId: 1,
          description: order.id,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const data = await response.json();
      const documentId = data['id'];

      response = await fetch(`${API_URL}/DocumentsExport?id=${documentId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const fileBuffer = await response.arrayBuffer();
      const fileData = Buffer.from(fileBuffer).toString('base64');

      return await updateOrderReleaseDocument(
        placementId,
        documentId,
        fileData,
      );
    },
    onSuccess: () => alert('Utworzono dokument WZ pomyślnie'),
    onError: (error) => {
      if (error.message.includes('The code field is required')) {
        alert(
          'Brakujące dane kodów magazynowych, dodaj wszystkie produkty od nowa',
        );
      } else if (error.message === 'MISSING_BUYER_ID') {
        alert('Brakujące dane nabywcy');
      } else if (error.message === 'MISSING_NIP') {
        alert('Brakujące pole NIP/PESEL');
      } else if (error.message === 'MISSING_ADDRESS') {
        alert('Brakujący adres nabywcy');
      } else {
        console.error(error.message);
        alert('Wystąpił błąd przy dodawaniu dokumentu WZ. Sprawdź konsolę');
      }
    },
  });
}

export type ReleaseDocument = {
  id: number;
  fullNumber: string;
  recipientCode: string;
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
              recipientCode: document['recipient']['code'],
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
