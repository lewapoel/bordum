import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentPlacementId } from '../utils/bitrix24.ts';
import { ReturnData } from '../models/bitrix/deal.ts';
import { getDeal, updateDealReturnData } from '../api/bitrix/deal.ts';
import update from 'immutability-helper';

type RowElements = {
  quantity: HTMLInputElement | null;
  reason: HTMLTextAreaElement | null;
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

    if (
      Object.values(returnData).some(
        (x) => x.returnQuantity > 0 && x.reason === '',
      )
    ) {
      alert('Powód zwrotu nie może być pusty');
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
              case selectedRow.quantity:
                selectedRow.reason?.focus();
                break;

              case selectedRow.reason:
                selectedRow.date?.focus();
                break;

              default:
                selectedRow.quantity?.focus();
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
                quantity: null,
                reason: null,
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
                <th>WZ</th>
                <th>Nazwa towaru</th>
                <th>Zamówiona ilość</th>
                <th>Jedn. miary</th>
                <th>Ilość do zwrotu</th>
                <th>Powód zwrotu</th>
                <th>Data zwrotu</th>
                <th>Zdjęcia</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(returnData).map(([itemId, returnData]) => (
                <tr
                  onMouseEnter={() => setSelectedItem(itemId)}
                  className={selectedItem === itemId ? 'bg-gray-300' : ''}
                  key={itemId}
                >
                  <td>{returnData.releaseDocument}</td>
                  <td>{returnData.item.productName}</td>
                  <td>{returnData.item.quantity}</td>
                  <td>{returnData.item.unit}</td>
                  <td>
                    <input
                      type='number'
                      className='w-[100px]'
                      min={0}
                      ref={(el) => {
                        if (rowsRef.current) {
                          rowsRef.current[itemId].quantity = el;
                        }
                      }}
                      value={returnData.returnQuantity}
                      onChange={(e) => {
                        setReturnData((prev) =>
                          update(prev, {
                            [itemId]: {
                              returnQuantity: {
                                $set: Math.min(
                                  returnData.item.quantity,
                                  Math.max(0, +e.target.value),
                                ),
                              },
                            },
                          }),
                        );
                      }}
                    />
                  </td>
                  <td>
                    <textarea
                      ref={(el) => {
                        if (rowsRef.current) {
                          rowsRef.current[itemId].reason = el;
                        }
                      }}
                      placeholder='Powód zwrotu'
                      value={returnData.reason}
                      onChange={(e) => {
                        setReturnData((prev) =>
                          update(prev, {
                            [itemId]: { reason: { $set: e.target.value } },
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
                  <td></td>
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
