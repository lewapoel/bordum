import { useGetReleaseDocuments } from '../api/comarch/document.ts';
import { useContext } from 'react';
import { AuthContext } from '../api/comarch/auth.ts';
import { getBitrix24 } from '../utils/bitrix24.ts';

export default function ReleaseDocuments() {
  const { token } = useContext(AuthContext);
  const documentsQuery = useGetReleaseDocuments(token);
  const documents = documentsQuery.data;

  return documents ? (
    <>
      <h1 className='mb-5'>Dokumenty WZ</h1>

      <table>
        <thead>
          <tr>
            <th>Numer dokumentu</th>
            <th>Numer oferty</th>
            <th>Kontrahent</th>
            <th>NIP kontrahenta</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id}>
              <td>{document.fullNumber}</td>
              <td
                className='cursor-pointer underline'
                onClick={() => {
                  const bx24 = getBitrix24();
                  if (!bx24) {
                    return;
                  }

                  bx24.openPath(`/crm/type/7/details/${document.description}/`);
                }}
              >
                {document.description}
              </td>
              <td>
                {document.recipient.name1} ({document.recipient.name2})
              </td>
              <td>{document.recipient.code}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  ) : documentsQuery.isLoading || !documents ? (
    <h1>Ładowanie dokumentów...</h1>
  ) : (
    <h1>Brak dokumentów</h1>
  );
}
