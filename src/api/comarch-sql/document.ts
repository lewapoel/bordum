import { SQL_API_URL } from './const.ts';

export async function setDocumentDueDate(
  token: string,
  documentId: number,
  date: string,
): Promise<boolean> {
  return fetch(`${SQL_API_URL}/document-due`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      document_id: documentId,
      payment_due: date.split('T')[0],
    }),
  })
    .then(async (response): Promise<boolean> => {
      const data = await response.json();

      return response.ok && data['success'];
    })
    .catch((error) => {
      console.error(error);
      alert('Nie udało się ustawić terminu zapłaty dokumentu');
      return false;
    });
}
