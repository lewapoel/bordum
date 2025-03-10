import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentPlacementId } from '../utils/bitrix24.ts';
import { getOrder, updateOrderPackagingData } from '../api/bitrix24/order.ts';
import update from 'immutability-helper';
import { OrderData, PackagingData } from '../models/order.ts';
import { getUsers, User } from '../api/bitrix24/user.ts';
import moment from 'moment';

type RowElements = {
  quality: HTMLSelectElement | null;
  packer: HTMLSelectElement | null;
  date: HTMLInputElement | null;
  comment: HTMLInputElement | null;
};

enum Status {
  LOADING,
  EMPTY,
  LOADED,
}

export default function Packaging() {
  const placementId = getCurrentPlacementId();
  const [order, setOrder] = useState<OrderData>();
  const [status, setStatus] = useState<Status>(Status.LOADING);
  const [selectedItem, setSelectedItem] = useState(0);

  const rowsRef = useRef<Array<RowElements>>(null);

  // Range of [1, 10]
  const qualities = Array(10)
    .fill(0)
    .map((_, i) => i + 1);

  const [packagingData, setPackagingData] = useState<Array<PackagingData>>();
  const [users, setUsers] = useState<Array<User>>();

  const saveData = useCallback(() => {
    if (!packagingData) {
      return;
    }

    if (!packagingData.every((data) => data.packerId > 0)) {
      alert('Brakujące dane w kolumnie: Osoba pakująca');
      return;
    }

    // Check if all allowed comment fields are filled
    if (
      !packagingData.every(
        (data) => data.quality >= 8 || data.comment?.length > 0,
      )
    ) {
      alert('Brakujące dane w kolumnie: Komentarz');
      return;
    }

    void updateOrderPackagingData(
      placementId,
      packagingData.map((data) => ({
        ...data,
        comment: data.quality < 8 ? data.comment : '', // make sure unnecessary comments don't get saved
      })),
    );
  }, [packagingData, placementId]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSelectedItem((prev) => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (order) {
            setSelectedItem((prev) =>
              Math.min(order.items.length - 1, prev + 1),
            );
          }
          break;
        case 'Enter':
          saveData();
          break;
        case 'Tab':
          e.preventDefault();

          if (rowsRef.current) {
            const selectedRow = rowsRef.current[selectedItem];

            switch (document.activeElement) {
              case selectedRow.quality:
                selectedRow.packer?.focus();
                break;

              case selectedRow.packer:
                selectedRow.date?.focus();
                break;

              case selectedRow.date:
                if (selectedRow.comment?.disabled) {
                  selectedRow.quality?.focus();
                } else {
                  selectedRow.comment?.focus();
                }
                break;

              default:
                selectedRow.quality?.focus();
                break;
            }
          }

          break;
        default:
          break;
      }
    },
    [order, selectedItem, saveData],
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
        } else {
          rowsRef.current = Array.from({ length: res.items.length }, () => ({
            quality: null,
            packer: null,
            date: null,
            comment: null,
          }));

          if (res.packagingData?.length === 0) {
            setPackagingData(
              Array.from({ length: res.items.length }, () => ({
                quality: 1,
                comment: '',
                date: moment().format('YYYY-MM-DD'),
                packerId: 0,
              })),
            );
          } else {
            setPackagingData(res.packagingData);
          }
        }
      }
    });

    getUsers().then((res) => {
      if (res) {
        setUsers(res);
      }
    });
  }, [placementId]);

  useEffect(() => {
    if (order && users && packagingData) {
      setStatus(Status.LOADED);
    }
  }, [order, users, packagingData]);

  return (
    <div>
      {status === Status.LOADED && packagingData && order && users ? (
        <>
          <h1 className='mb-5'>Pakowanie (szczegółowa kontrola jakości)</h1>

          <div className='mb-10'>
            <p className='mb-3 font-bold'>Legenda jakości</p>
            <table className='mx-auto'>
              <thead>
                <tr>
                  <th>Zakres jakości</th>
                  <th>Znaczenie</th>
                  <th>Wymagany komentarz</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>8 - 10</td>
                  <td>produkt bez wad</td>
                  <td>nie</td>
                </tr>
                <tr>
                  <td>4 - 8</td>
                  <td>elementy z wadami lecz nadają się do sprzedaży</td>
                  <td>tak</td>
                </tr>
                <tr>
                  <td>1 - 4</td>
                  <td>elementy drugiego sortu które muszą być zrabatowane</td>
                  <td>tak</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className='justify-center flex items-center gap-2 mb-10'>
            <button className='confirm' onClick={() => saveData()}>
              Zapisz (ENTER)
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
                <th>Ilość</th>
                <th>Jedn. miary</th>
                <th>Jakość</th>
                <th>Osoba pakująca</th>
                <th>Data zapakowania</th>
                <th>Komentarz</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr
                  onMouseEnter={() => setSelectedItem(idx)}
                  className={selectedItem === idx ? 'bg-gray-300' : ''}
                  key={item.id}
                >
                  <td>{item.productName}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unit}</td>
                  <td>
                    <select
                      ref={(el) => {
                        if (rowsRef.current) {
                          rowsRef.current[idx].quality = el;
                        }
                      }}
                      value={packagingData[idx].quality}
                      onChange={(e) => {
                        setPackagingData((prev) =>
                          update(prev, {
                            [idx]: {
                              quality: { $set: +e.target.value },
                            },
                          }),
                        );
                      }}
                    >
                      {qualities.map((quality, idx) => (
                        <option value={quality} key={idx}>
                          {quality}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      ref={(el) => {
                        if (rowsRef.current) {
                          rowsRef.current[idx].packer = el;
                        }
                      }}
                      value={packagingData[idx].packerId}
                      onChange={(e) => {
                        setPackagingData((prev) =>
                          update(prev, {
                            [idx]: {
                              packerId: { $set: +e.target.value },
                            },
                          }),
                        );
                      }}
                    >
                      <option value='0' disabled>
                        Wybierz z listy...
                      </option>
                      {users.map((user) => (
                        <option value={user.id} key={user.id}>
                          {user.firstName} {user.lastName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      ref={(el) => {
                        if (rowsRef.current) {
                          rowsRef.current[idx].date = el;
                        }
                      }}
                      type='date'
                      value={packagingData[idx].date}
                      onChange={(e) => {
                        setPackagingData((prev) =>
                          update(prev, {
                            [idx]: { date: { $set: e.target.value } },
                          }),
                        );
                      }}
                    />
                  </td>
                  <td>
                    <input
                      ref={(el) => {
                        if (rowsRef.current) {
                          rowsRef.current[idx].comment = el;
                        }
                      }}
                      type='text'
                      placeholder='Komentarz'
                      className='disabled:cursor-not-allowed'
                      disabled={packagingData[idx].quality >= 8}
                      value={
                        packagingData[idx].quality >= 8
                          ? 'n/d'
                          : packagingData[idx].comment
                      }
                      onChange={(e) => {
                        setPackagingData((prev) =>
                          update(prev, {
                            [idx]: { comment: { $set: e.target.value } },
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
          {status === Status.LOADING && <h1>Ładowanie danych zamówienia...</h1>}
          {status === Status.EMPTY && <h1>Zamówienie jest puste</h1>}
        </>
      )}
    </div>
  );
}
