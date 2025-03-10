import { API_URL } from './const.ts';
import { useMutation } from '@tanstack/react-query';
import { OrderItem } from '../../models/order.ts';

export type ReleaseDocument = {
  items: Array<OrderItem>;
};

export function useAddReleaseDocument(token: string) {
  return useMutation({
    mutationKey: ['add-release-document'],
    mutationFn: async (document: ReleaseDocument) => {
      const response = await fetch(`${API_URL}/Documents`, {
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
          elements: document.items.map((item) => ({
            code: item.warehouseCode,
            quantity: item.quantity,
            unitGrossPrice: item.unitPrice,
            setCustomValue: false,
          })),
          status: 1,
          sourceWarehouseId: 1,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return response.json();
    },
    onSuccess: () => alert('Utworzono dokument WZ pomyślnie'),
    onError: (error) => {
      if (error.message.includes('The code field is required')) {
        alert(
          'Brakujące dane kodów magazynowych, dodaj wszystkie produkty od nowa',
        );
      } else {
        console.error(error.message);
        alert('Wystąpił błąd przy dodawaniu dokumentu WZ. Sprawdź konsolę');
      }
    },
  });
}
