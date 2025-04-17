import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getCurrentPlacementId } from '../utils/bitrix24.ts';
import {
  getOrder,
  updateOrderVerificationData,
} from '../api/bitrix24/order.ts';
import update from 'immutability-helper';
import { OrderData, VerificationData } from '../models/bitrix/order.ts';
import { ITEM_GROUPS } from '../data/groups.ts';
import { useGetStocks } from '../api/comarch/stock.ts';
import { AuthContext } from '../api/comarch/auth.ts';

type RowElements = {
  actualStock: HTMLInputElement | null;
  qualityGoods: HTMLInputElement | null;
  comment: HTMLInputElement | null;
};

type RowsElements = { [key: string]: RowElements };

enum Status {
  LOADING,
  EMPTY,
  LOADED,
  INVALID,
}

export default function Verification() {
  const { token } = useContext(AuthContext);
  const placementId = getCurrentPlacementId();
  const [order, setOrder] = useState<OrderData>();
  const [status, setStatus] = useState<Status>(Status.LOADING);
  const [selectedItem, setSelectedItem] = useState('0');
  const [verificationData, setVerificationData] = useState<VerificationData>();
  const stocksQuery = useGetStocks(token, 1);
  const stocks = stocksQuery.data;

  const rowsRef = useRef<RowsElements>(null);

  const saveData = useCallback(() => {
    if (!verificationData) {
      return;
    }

    void updateOrderVerificationData(placementId, verificationData);
  }, [verificationData, placementId]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSelectedItem((prev) => {
            if (verificationData) {
              const keys = Object.keys(verificationData);
              const current = keys.indexOf(prev);

              return keys[Math.max(0, current - 1)];
            }

            return prev;
          });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedItem((prev) => {
            if (verificationData) {
              const keys = Object.keys(verificationData);
              const current = keys.indexOf(prev);

              return keys[Math.min(keys.length - 1, current + 1)];
            }

            return prev;
          });
          break;
        case 'Insert':
          saveData();
          break;
        case 'Tab':
          e.preventDefault();

          if (rowsRef.current) {
            const selectedRow = rowsRef.current[selectedItem];

            switch (document.activeElement) {
              case selectedRow.actualStock:
                selectedRow.qualityGoods?.focus();
                selectedRow.qualityGoods?.select();
                break;

              case selectedRow.qualityGoods:
                selectedRow.comment?.focus();
                break;

              default:
                selectedRow.actualStock?.focus();
                selectedRow.actualStock?.select();
                break;
            }
          }

          break;
        default:
          break;
      }
    },
    [selectedItem, saveData, verificationData],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    if (!placementId) {
      alert('Nie można pobrać ID aktualnej oferty');
      return;
    }

    getOrder(placementId).then((res) => {
      if (res) {
        setOrder(res);

        if (res.items.length === 0) {
          setStatus(Status.EMPTY);
        } else if (
          res.items.some((item) => item.itemId === '' || item.groupId === '')
        ) {
          setStatus(Status.INVALID);
        } else {
          rowsRef.current = res.items.reduce((acc: RowsElements, item) => {
            acc[item.id!.toString()] = {
              actualStock: null,
              qualityGoods: null,
              comment: null,
            };

            return acc;
          }, {});

          if (res.verificationData) {
            setVerificationData(res.verificationData);
          }
        }
      }
    });
  }, [placementId]);

  useEffect(() => {
    if (order && verificationData && !stocksQuery.isLoading) {
      setStatus(Status.LOADED);
    }
  }, [order, verificationData, stocksQuery]);

  return (
    <div>
      {status === Status.LOADED && verificationData && order && stocks ? (
        <>
          <h1 className='mb-5'>Weryfikacja stanu</h1>

          <div className='justify-center flex items-center gap-2 mb-10'>
            <button className='confirm' onClick={() => saveData()}>
              Zapisz (INSERT)
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
                <th>Stan Comarch</th>
                <th>Stan rzeczywisty</th>
                <th>Ilość towaru jakościowego</th>
                <th>Ilość do zamówienia</th>
                <th>Komentarz</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr
                  onMouseEnter={() => setSelectedItem(item.id!.toString())}
                  className={
                    selectedItem === item.id!.toString() ? 'bg-gray-300' : ''
                  }
                  key={item.id}
                >
                  <td>{item.productName}</td>
                  <td>{ITEM_GROUPS[item.groupId]}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unit}</td>
                  <td>{stocks[+item.itemId].quantity}</td>
                  <td>
                    <input
                      type='number'
                      className='w-[100px]'
                      min={0}
                      ref={(el) => {
                        if (rowsRef.current) {
                          rowsRef.current[item.id!.toString()].actualStock = el;
                        }
                      }}
                      value={verificationData[item.id!.toString()].actualStock}
                      onChange={(e) => {
                        setVerificationData((prev) =>
                          update(prev, {
                            [item.id!]: {
                              actualStock: {
                                $set: Math.max(0, +e.target.value),
                              },
                            },
                          }),
                        );
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type='number'
                      className='w-[100px]'
                      min={0}
                      ref={(el) => {
                        if (rowsRef.current) {
                          rowsRef.current[item.id!.toString()].qualityGoods =
                            el;
                        }
                      }}
                      value={verificationData[item.id!.toString()].qualityGoods}
                      onChange={(e) => {
                        setVerificationData((prev) =>
                          update(prev, {
                            [item.id!]: {
                              qualityGoods: {
                                $set: Math.max(0, +e.target.value),
                              },
                            },
                          }),
                        );
                      }}
                    />
                  </td>
                  <td>
                    {Math.max(
                      0,
                      item.quantity -
                        verificationData[item.id!.toString()].qualityGoods,
                    )}
                  </td>
                  <td>
                    <input
                      ref={(el) => {
                        if (rowsRef.current) {
                          rowsRef.current[item.id!].comment = el;
                        }
                      }}
                      type='text'
                      placeholder='Komentarz'
                      value={verificationData[item.id!].comment}
                      onChange={(e) => {
                        setVerificationData((prev) =>
                          update(prev, {
                            [item.id!]: { comment: { $set: e.target.value } },
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
          {status === Status.EMPTY && <h1>Oferta jest pusta</h1>}
          {status === Status.INVALID && (
            <h1>
              Produkty oferty zawierają niekompletne dane, dodaj je ponownie
            </h1>
          )}
        </>
      )}
    </div>
  );
}
