import {
  DocumentAttribute,
  ReleaseDocument,
  useGetReleaseDocuments,
  useUpdateDocumentAttributes,
} from '../api/comarch/document.ts';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
    recipient?: HighlightRanges | null;
    document?: HighlightRanges | null;
    offer?: HighlightRanges | null;
    grossAmount?: HighlightRanges | null;
    paidAmount?: HighlightRanges | null;
    remainingAmount?: HighlightRanges | null;
  };
};

type SearchRef = {
  recipient: HTMLInputElement | null;
  document: HTMLInputElement | null;
  offer: HTMLInputElement | null;
  grossAmount: HTMLInputElement | null;
  paidAmount: HTMLInputElement | null;
  remainingAmount: HTMLInputElement | null;
};

type DocumentsUpdates = { paidAmount: string };

type RowElements = {
  paidAmount: HTMLInputElement | null;
};

type RowsElements = {
  [key: number]: RowElements;
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
    mapResultItem: useCallback(
      ({ item, matches: [highlightRanges] }) => ({
        item,
        highlightRanges,
      }),
      [],
    ),
  });
}

export default function ReleaseDocuments() {
  const { token } = useContext(AuthContext);
  const documentsQuery = useGetReleaseDocuments(token);
  const documents = documentsQuery.data;

  const updateDocumentAttributesMutation = useUpdateDocumentAttributes(token);

  const [selectedItem, setSelectedItem] = useState<number>(0);
  const [documentsUpdates, setDocumentsUpdates] = useState<DocumentsUpdates>();
  const [lastSaved, setLastSaved] = useState<number>();
  const [saving, setSaving] = useState(false);

  const rowsRef = useRef<RowsElements>(null);

  const [searchTerm, setSearchTerm] = useState({
    recipient: '',
    document: '',
    offer: '',
    grossAmount: '',
    paidAmount: '',
    remainingAmount: '',
  });
  const searchBarRef = useRef<SearchRef>({
    recipient: null,
    document: null,
    offer: null,
    grossAmount: null,
    paidAmount: null,
    remainingAmount: null,
  });

  const filteredByRecipient = useFilterBy(
    documents ?? [],
    searchTerm.recipient,
    useCallback((item) => [item.recipientName], []),
  );

  const filteredByDocument = useFilterBy(
    documents ?? [],
    searchTerm.document,
    useCallback((item) => [item.fullNumber], []),
  );

  const filteredByOffer = useFilterBy(
    documents ?? [],
    searchTerm.offer,
    useCallback((item) => [item.orderId], []),
  );

  const filteredByGrossAmount = useFilterBy(
    documents ?? [],
    searchTerm.grossAmount,
    useCallback((item) => [item.grossAmount.toString()], []),
  );

  const filteredByPaidAmount = useFilterBy(
    documents ?? [],
    searchTerm.paidAmount,
    useCallback((item) => [item.paidAmount.toString()], []),
  );

  const filteredByRemainingAmount = useFilterBy(
    documents ?? [],
    searchTerm.remainingAmount,
    useCallback((item) => [item.remainingAmount.toString()], []),
  );

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

    addItems(filteredByRecipient, 'recipient', true);
    addItems(filteredByDocument, 'document');
    addItems(filteredByOffer, 'offer');
    addItems(filteredByGrossAmount, 'grossAmount');
    addItems(filteredByPaidAmount, 'paidAmount');
    addItems(filteredByRemainingAmount, 'remainingAmount');

    return Object.values(result);
  }, [
    filteredByRecipient,
    filteredByDocument,
    filteredByOffer,
    filteredByGrossAmount,
    filteredByPaidAmount,
    filteredByRemainingAmount,
  ]);

  const saveData = useCallback(
    (documentId: number) => {
      if (!documents || !documentsUpdates) {
        return;
      }

      const attributes: Array<DocumentAttribute> = [
        {
          code: 'ZAPLACONO',
          value: documentsUpdates.paidAmount,
        },
      ];

      setLastSaved(documentId);
      setSaving(true);

      updateDocumentAttributesMutation.mutate(
        {
          documentId,
          attributes,
        },
        {
          onSettled: () => {
            setSaving(false);
          },
        },
      );
    },
    [documents, documentsUpdates, updateDocumentAttributesMutation],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSelectedItem((prev) => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
          e.preventDefault();

          setSelectedItem((prev) =>
            Math.min(prev + 1, filteredDocuments.length),
          );
          break;
        case 'Tab':
          e.preventDefault();

          if (rowsRef.current && selectedItem in filteredDocuments) {
            const selectedRow =
              rowsRef.current[filteredDocuments[selectedItem].item.id];

            switch (document.activeElement) {
              default:
                selectedRow.paidAmount?.focus();
                selectedRow.paidAmount?.select();
                break;
            }
          }

          break;
        case 'Enter':
          e.preventDefault();

          if (selectedItem in filteredDocuments) {
            saveData(filteredDocuments[selectedItem].item.id);
          }
          break;
        default:
          break;
      }
    },
    [selectedItem, saveData, filteredDocuments],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    if (selectedItem in filteredDocuments) {
      setDocumentsUpdates({
        paidAmount: filteredDocuments[selectedItem].item.paidAmount.toString(),
      });
    }
  }, [selectedItem, filteredDocuments]);

  useEffect(() => {
    if (documents) {
      rowsRef.current = documents.reduce((acc: RowsElements, item) => {
        acc[item.id] = {
          paidAmount: null,
        };

        return acc;
      }, {});
    }
  }, [documents]);

  return documents && documentsUpdates ? (
    <>
      <h1 className='mb-5'>Dokumenty WZ</h1>

      <div className='text-[20px] justify-center flex items-center gap-4 mb-10'>
        <p>Zmień zaznaczoną pozycję (↑/↓)</p>
        <p>Zmień pole (TAB)</p>
      </div>

      <table>
        <thead>
          <tr>
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
                className='searchbar w-full'
              />
            </th>
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
                className='searchbar w-full'
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
                className='searchbar w-full'
              />
            </th>
            <th>
              <p>Kwota brutto</p>
              <input
                ref={(el) => {
                  searchBarRef.current.grossAmount = el;
                }}
                type='text'
                placeholder='Szukaj...'
                value={searchTerm.grossAmount}
                onChange={(e) =>
                  setSearchTerm((prev) =>
                    update(prev, { grossAmount: { $set: e.target.value } }),
                  )
                }
                className='searchbar w-full'
              />
            </th>
            <th>
              <p>Zapłacono</p>
              <input
                ref={(el) => {
                  searchBarRef.current.paidAmount = el;
                }}
                type='text'
                placeholder='Szukaj...'
                value={searchTerm.paidAmount}
                onChange={(e) =>
                  setSearchTerm((prev) =>
                    update(prev, { paidAmount: { $set: e.target.value } }),
                  )
                }
                className='searchbar w-full'
              />
            </th>
            <th>
              <p>Pozostało</p>
              <input
                ref={(el) => {
                  searchBarRef.current.remainingAmount = el;
                }}
                type='text'
                placeholder='Szukaj...'
                value={searchTerm.remainingAmount}
                onChange={(e) =>
                  setSearchTerm((prev) =>
                    update(prev, { remainingAmount: { $set: e.target.value } }),
                  )
                }
                className='searchbar w-full'
              />
            </th>
            <th>
              <p>Akcje</p>
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredDocuments.map(({ item, highlights }, idx) => (
            <tr
              onMouseEnter={() => setSelectedItem(idx)}
              className={selectedItem === idx ? 'bg-gray-300' : ''}
              key={item.id}
            >
              <td>
                <Highlight
                  text={item.recipientName}
                  ranges={highlights.recipient!}
                />
              </td>
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

                  bx24.openPath(`/crm/type/7/details/${item.orderId}/`);
                }}
              >
                <Highlight text={item.orderId} ranges={highlights.offer!} />
              </td>
              <td>
                <Highlight
                  text={item.grossAmount.toFixed(2)}
                  ranges={highlights.grossAmount!}
                />
              </td>
              <td>
                {selectedItem === idx ? (
                  <input
                    type='number'
                    className='w-[150px]'
                    min={0}
                    ref={(el) => {
                      if (rowsRef.current) {
                        rowsRef.current[item.id].paidAmount = el;
                      }
                    }}
                    value={documentsUpdates.paidAmount}
                    onChange={(e) => {
                      setDocumentsUpdates((prev) =>
                        update(prev, {
                          paidAmount: { $set: e.target.value },
                        }),
                      );
                    }}
                  />
                ) : (
                  <Highlight
                    text={item.paidAmount.toFixed(2)}
                    ranges={highlights.paidAmount!}
                  />
                )}
              </td>
              <td>
                <Highlight
                  text={item.remainingAmount.toFixed(2)}
                  ranges={highlights.remainingAmount!}
                />
              </td>
              <td>
                <button
                  className={
                    saving && item.id === lastSaved ? 'disabled' : 'confirm'
                  }
                  disabled={saving && item.id === lastSaved}
                  onClick={() => saveData(item.id)}
                >
                  {item.id === lastSaved
                    ? saving
                      ? 'Zapisywanie...'
                      : 'Zapisano (ENTER)'
                    : 'Zapisz (ENTER)'}
                </button>
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
