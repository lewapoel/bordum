import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentPlacementId } from '../utils/bitrix24.ts';
import { ITEM_GROUPS } from '../data/comarch/groups.ts';
import { ReturnData } from '../models/bitrix/deal.ts';
import { getDeal, updateDealReturnData } from '../api/bitrix/deal.ts';
import update from 'immutability-helper';

type RowElements = {
  wantsReturn: HTMLInputElement | null;
  comment: HTMLTextAreaElement | null;
  date: HTMLInputElement | null;
};

type RowsElements = { [key: string]: RowElements };

enum Status {
  EMPTY,
  LOADING,
  LOADED,
  SAVING,
}

export default function Return() {
  const placementId = getCurrentPlacementId();
  const [status, setStatus] = useState<Status>(Status.LOADING);
  const [selectedItem, setSelectedItem] = useState('0');
  const [returnData, setReturnData] = useState<ReturnData>();

  const rowsRef = useRef<RowsElements>(null);

  const saveData = useCallback(() => {
    if (!returnData) {
      return;
    }

    setStatus(Status.SAVING);
    updateDealReturnData(placementId, returnData).then(() => {
      setStatus(Status.LOADED);
    });
  }, [returnData, placementId]);

  const removeItem = useCallback(() => {
    if (returnData) {
      setReturnData((prev) => update(prev, { $unset: [selectedItem] }));
    }
  }, [returnData, selectedItem]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSelectedItem((prev) => {
            if (returnData) {
              const keys = Object.keys(returnData);
              const current = keys.indexOf(prev);

              return keys[Math.max(0, current - 1)];
            }

            return prev;
          });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedItem((prev) => {
            if (returnData) {
              const keys = Object.keys(returnData);
              const current = keys.indexOf(prev);

              return keys[Math.min(keys.length - 1, current + 1)];
            }

            return prev;
          });
          break;
        case 'Insert':
          saveData();
          break;
        case 'Delete':
          removeItem();
          break;
        case 'Tab':
          e.preventDefault();

          if (rowsRef.current) {
            const selectedRow = rowsRef.current[selectedItem];

            switch (document.activeElement) {
              case selectedRow.wantsReturn:
                selectedRow.date?.focus();
                break;

              case selectedRow.date:
                selectedRow.comment?.focus();
                break;

              default:
                selectedRow.wantsReturn?.focus();
                break;
            }
          }

          break;
        default:
          break;
      }
    },
    [selectedItem, saveData, returnData, removeItem],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    if (!placementId) {
      alert('Nie można pobrać ID aktualnego deala');
      return;
    }

    getDeal(placementId).then((res) => {
      if (res) {
        if (!res.returnData || Object.keys(res.returnData).length === 0) {
          setStatus(Status.EMPTY);
        } else {
          rowsRef.current = Object.keys(res.returnData).reduce(
            (acc: RowsElements, key) => {
              acc[key] = {
                comment: null,
                wantsReturn: null,
                date: null,
              };

              return acc;
            },
            {},
          );

          setReturnData(res.returnData);
        }
      }
    });
  }, [placementId]);

  useEffect(() => {
    if (returnData && status === Status.LOADING) {
      setStatus(Status.LOADED);
    }
  }, [status, returnData]);

  return (
    <div>
      {status === Status.LOADED && returnData ? (
        <>
          <h1 className='mb-5'>Zwroty</h1>

          <div className='justify-center flex items-center gap-2 mb-10'>
            <button className='confirm' onClick={() => saveData()}>
              Zapisz (INSERT)
            </button>
            <button className='delete' onClick={() => removeItem()}>
              Usuń zaznaczoną pozycję (DELETE)
            </button>
          </div>

          <div className='text-[20px] justify-center flex items-center gap-4 mb-10'>
            <p>Zmień zaznaczoną pozycję (↑/↓)</p>
            <p>Zmień pole (TAB)</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Nazwa towaru</th>
                <th>Kategoria produktu</th>
                <th>Zamówiona ilość</th>
                <th>Jedn. miary</th>
                <th>Zwrot</th>
                <th>Data zwrotu</th>
                <th>Komentarz</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(returnData).map(([itemId, returnData]) => (
                <tr
                  onMouseEnter={() => setSelectedItem(itemId)}
                  className={selectedItem === itemId ? 'bg-gray-300' : ''}
                  key={itemId}
                >
                  <td>{returnData.item.productName}</td>
                  <td>{ITEM_GROUPS[returnData.item.groupId]}</td>
                  <td>{returnData.item.quantity}</td>
                  <td>{returnData.item.unit}</td>
                  <td>
                    <input
                      type='checkbox'
                      className='w-[25px] h-[25px]'
                      ref={(el) => {
                        if (rowsRef.current) {
                          rowsRef.current[itemId].wantsReturn = el;
                        }
                      }}
                      checked={returnData.wantsReturn}
                      onChange={(e) => {
                        setReturnData((prev) =>
                          update(prev, {
                            [itemId]: {
                              wantsReturn: {
                                $set: e.target.checked,
                              },
                            },
                          }),
                        );
                      }}
                    />
                  </td>
                  <td>
                    <input
                      ref={(el) => {
                        if (rowsRef.current) {
                          rowsRef.current[itemId].date = el;
                        }
                      }}
                      type='date'
                      value={returnData.date}
                      onChange={(e) => {
                        setReturnData((prev) =>
                          update(prev, {
                            [itemId]: { date: { $set: e.target.value } },
                          }),
                        );
                      }}
                    />
                  </td>
                  <td>
                    <textarea
                      ref={(el) => {
                        if (rowsRef.current) {
                          rowsRef.current[itemId].comment = el;
                        }
                      }}
                      placeholder='Komentarz'
                      value={returnData.comment}
                      onChange={(e) => {
                        setReturnData((prev) =>
                          update(prev, {
                            [itemId]: { comment: { $set: e.target.value } },
                          }),
                        );
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <>
          {status === Status.LOADING && <h1>Ładowanie danych...</h1>}
          {status === Status.EMPTY && <h1>Dane zwrotu są puste</h1>}
          {status === Status.SAVING && <h1>Zapisywanie danych...</h1>}
        </>
      )}
    </div>
  );
}
