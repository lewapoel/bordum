import {
  ReleaseDocument,
  useGetReleaseDocuments,
} from '../api/comarch/document.ts';
import { useContext, useMemo, useRef, useState } from 'react';
import { AuthContext } from '../api/comarch/auth.ts';
import { getBitrix24 } from '../utils/bitrix24.ts';
import { Highlight, useFuzzySearchList } from '@nozbe/microfuzz/react';
import { HighlightRanges } from '@nozbe/microfuzz';
import update from 'immutability-helper';

type Match = {
  item: ReleaseDocument;
  highlightRanges: HighlightRanges | null;
};

type MultiMatch = {
  item: ReleaseDocument;
  highlights: {
    document?: HighlightRanges | null;
    offer?: HighlightRanges | null;
    nip?: HighlightRanges | null;
    recipient?: HighlightRanges | null;
  };
};

type SearchRef = {
  document: HTMLInputElement | null;
  offer: HTMLInputElement | null;
  nip: HTMLInputElement | null;
  recipient: HTMLInputElement | null;
};

function useFilterBy(
  documents: Array<ReleaseDocument>,
  queryText: string,
  getText: (item: ReleaseDocument) => Array<string | null>,
) {
  return useFuzzySearchList<ReleaseDocument, Match>({
    list: documents ?? [],
    queryText,
    getText,
    mapResultItem: ({ item, matches: [highlightRanges] }) => ({
      item,
      highlightRanges,
    }),
  });
}

export default function ReleaseDocuments() {
  const { token } = useContext(AuthContext);
  const documentsQuery = useGetReleaseDocuments(token);
  const documents = documentsQuery.data;

  const [searchTerm, setSearchTerm] = useState({
    document: '',
    offer: '',
    nip: '',
    recipient: '',
  });
  const searchBarRef = useRef<SearchRef>({
    document: null,
    offer: null,
    nip: null,
    recipient: null,
  });

  const filteredByDocument = useFilterBy(
    documents ?? [],
    searchTerm.document,
    (item) => [item.fullNumber],
  );

  const filteredByOffer = useFilterBy(
    documents ?? [],
    searchTerm.offer,
    (item) => [item.description],
  );

  const filteredByRecipient = useFilterBy(
    documents ?? [],
    searchTerm.recipient,
    (item) => [item.recipientName],
  );

  const filteredByNip = useFilterBy(documents ?? [], searchTerm.nip, (item) => [
    item.recipientCode,
  ]);

  const filteredDocuments: Array<MultiMatch> = useMemo(() => {
    const result: { [key: string]: MultiMatch } = {};

    const addItems = (
      filteredMatches: Array<Match>,
      type: string,
      first: boolean = false,
    ) => {
      if (first) {
        filteredMatches.forEach((match) => {
          result[match.item.id] = {
            item: match.item,
            highlights: {
              [type]: match.highlightRanges,
            },
          };
        });
      } else {
        const keyedMatches = filteredMatches.reduce(
          (acc: { [key: string]: Match }, match) => {
            acc[match.item.id] = match;
            return acc;
          },
          {},
        );

        Object.keys(result).forEach((key) => {
          if (!Object.keys(keyedMatches).includes(key)) {
            delete result[key];
          } else {
            result[key].highlights = {
              ...result[key].highlights,
              [type]: keyedMatches[key].highlightRanges,
            };
          }
        });
      }
    };

    addItems(filteredByDocument, 'document', true);
    addItems(filteredByOffer, 'offer');
    addItems(filteredByNip, 'nip');
    addItems(filteredByRecipient, 'recipient');

    return Object.values(result);
  }, [filteredByDocument, filteredByOffer, filteredByNip, filteredByRecipient]);

  return documents ? (
    <>
      <h1 className='mb-5'>Dokumenty WZ</h1>

      <table>
        <thead>
          <tr>
            <th>
              <p>Numer dokumentu</p>
              <input
                ref={(el) => {
                  searchBarRef.current.document = el;
                }}
                type='text'
                placeholder='Szukaj...'
                value={searchTerm.document}
                onChange={(e) =>
                  setSearchTerm((prev) =>
                    update(prev, { document: { $set: e.target.value } }),
                  )
                }
                className='searchbar w-full max-w-[1000px]'
              />
            </th>
            <th>
              <p>Numer oferty</p>
              <input
                ref={(el) => {
                  searchBarRef.current.offer = el;
                }}
                type='text'
                placeholder='Szukaj...'
                value={searchTerm.offer}
                onChange={(e) =>
                  setSearchTerm((prev) =>
                    update(prev, { offer: { $set: e.target.value } }),
                  )
                }
                className='searchbar w-full max-w-[1000px]'
              />
            </th>
            <th>
              <p>Kontrahent</p>
              <input
                ref={(el) => {
                  searchBarRef.current.recipient = el;
                }}
                type='text'
                placeholder='Szukaj...'
                value={searchTerm.recipient}
                onChange={(e) =>
                  setSearchTerm((prev) =>
                    update(prev, { recipient: { $set: e.target.value } }),
                  )
                }
                className='searchbar w-full max-w-[1000px]'
              />
            </th>
            <th>
              <p>NIP kontrahenta</p>
              <input
                ref={(el) => {
                  searchBarRef.current.nip = el;
                }}
                type='text'
                placeholder='Szukaj...'
                value={searchTerm.nip}
                onChange={(e) =>
                  setSearchTerm((prev) =>
                    update(prev, { nip: { $set: e.target.value } }),
                  )
                }
                className='searchbar w-full max-w-[1000px]'
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredDocuments.map(({ item, highlights }) => (
            <tr key={item.id}>
              <td>
                <Highlight
                  text={item.fullNumber}
                  ranges={highlights.document!}
                />
              </td>
              <td
                className='cursor-pointer underline'
                onClick={() => {
                  const bx24 = getBitrix24();
                  if (!bx24) {
                    return;
                  }

                  bx24.openPath(`/crm/type/7/details/${item.description}/`);
                }}
              >
                <Highlight text={item.description} ranges={highlights.offer!} />
              </td>
              <td>
                <Highlight
                  text={item.recipientName}
                  ranges={highlights.recipient!}
                />
              </td>
              <td>
                <Highlight text={item.recipientCode} ranges={highlights.nip!} />
              </td>
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
