import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentPlacementId } from '../utils/bitrix24.ts';
import { getOrder, updateOrderPackagingData } from '../api/bitrix/order.ts';
import update from 'immutability-helper';
import { getCurrentUser } from '../api/bitrix/user.ts';
import { OrderData, PackagingData } from '../models/bitrix/order.ts';
import { User } from '../models/bitrix/user.ts';
import clsx from 'clsx';

type RowElements = {
  quality: HTMLSelectElement | null;
  packer: HTMLSelectElement | null;
  date: HTMLInputElement | null;
  comment: HTMLTextAreaElement | null;
};

type RowsElements = { [key: string]: RowElements };

enum Status {
  LOADING,
  EMPTY,
  LOADED,
}

export default function Packaging() {
  const placementId = getCurrentPlacementId();
  const [currentUserId, setCurrentUserId] = useState<number>();
  const [order, setOrder] = useState<OrderData>();
  const [status, setStatus] = useState<Status>(Status.LOADING);
  const [selectedItem, setSelectedItem] = useState('0');

  const [lastSaved, setLastSaved] = useState<string>();
  const [saving, setSaving] = useState(false);

  const rowsRef = useRef<RowsElements>(null);

  // Range of [1, 10]
  const qualities = Array(10)
    .fill(0)
    .map((_, i) => i + 1);

  const [originalPackagingData, setOriginalPackagingData] =
    useState<PackagingData>();
  const [packagingData, setPackagingData] = useState<PackagingData>();
  const users = useState<Array<User>>(
    JSON.parse(import.meta.env.VITE_PACKAGING_USERS),
  )[0];

  const saveData = useCallback(
    async (itemId: string) => {
      if (!packagingData || !originalPackagingData || !order) {
        return;
      }

      const data = packagingData[itemId];
      if (!data) {
        return;
      }

      if (!data.packerId) {
        alert('Brakujące dane w kolumnie: Osoba pakująca');
        return;
      }

      // Check if all allowed comment fields are filled
      if (data.quality < 8 && data.comment?.length === 0) {
        alert('Brakujące dane w kolumnie: Komentarz');
        return;
      }

      setLastSaved(itemId);
      setSaving(true);

      const updatedFields = {
        saved: true,
        comment: data.quality < 8 ? data.comment : '',
      };

      const newPackagingData = update(packagingData, {
        [itemId]: { $merge: updatedFields },
      });

      const newOriginalPackagingData = update(originalPackagingData, {
        [itemId]: { $set: newPackagingData[itemId] },
      });

      await updateOrderPackagingData(
        placementId,
        newOriginalPackagingData,
        true,
      );

      setPackagingData(newPackagingData);
      setOriginalPackagingData(newOriginalPackagingData);

      alert('Dane pakowania zapisane pomyślnie');
      setSaving(false);
    },
    [packagingData, placementId, originalPackagingData, order],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSelectedItem((prev) => {
            if (packagingData) {
              const keys = Object.keys(packagingData);
              const current = keys.indexOf(prev);

              return keys[Math.max(0, current - 1)];
            }

            return prev;
          });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedItem((prev) => {
            if (packagingData) {
              const keys = Object.keys(packagingData);
              const current = keys.indexOf(prev);

              return keys[Math.min(keys.length - 1, current + 1)];
            }

            return prev;
          });
          break;
        case 'Enter':
          void saveData(selectedItem);
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
    [selectedItem, saveData, packagingData],
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
          rowsRef.current = res.items.reduce((acc: RowsElements, item) => {
            acc[item.id!.toString()] = {
              quality: null,
              packer: null,
              date: null,
              comment: null,
            };

            return acc;
          }, {});

          if (res.packagingData) {
            setOriginalPackagingData(res.packagingData);
            setPackagingData(res.packagingData);
          }
        }
      }
    });

    getCurrentUser().then((res) => {
      if (res) {
        setCurrentUserId(res.id);
      }
    });
  }, [placementId]);

  useEffect(() => {
    if (order && users && packagingData) {
      setStatus(Status.LOADED);
    }
  }, [order, users, packagingData]);

  useEffect(() => {
    if (currentUserId) {
      setPackagingData((prev) => {
        if (prev) {
          const keys = Object.keys(prev);

          keys.forEach((key) => {
            prev = update(prev, {
              [key]: {
                $apply: (item) => ({
                  ...item,
                  packerId: item.packerId === 0 ? currentUserId : item.packerId,
                }),
              },
            });
          });
        }

        return prev;
      });
    }
  }, [currentUserId]);

  return (
    <div>
      {status === Status.LOADED && packagingData && order && users ? (
        <>
          <h1 className='mb-5'>Pakowanie (szczegółowa kontrola jakości)</h1>

          <div className='text-[20px] justify-center flex items-center gap-4 mb-10'>
            <p>Zmień zaznaczoną pozycję (↑/↓)</p>
            <p>Zmień pole (TAB)</p>
          </div>

          <table>
            <thead className='bg-white freeze'>
              <tr>
                <th>Nazwa towaru</th>
                <th>Ilość</th>
                <th>Jedn. miary</th>
                <th>Jakość</th>
                <th>Osoba pakująca</th>
                <th>Data zapakowania</th>
                <th>Komentarz</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => {
                const itemId = item.id!.toString();
                const isPackageable = itemId in packagingData;

                const selected = selectedItem === itemId;
                const saved = packagingData[itemId]?.saved;

                const bgClassName = clsx({
                  'bg-green-600': selected && saved,
                  'bg-green-300': saved && !selected,
                  'bg-gray-300': selected && !saved,
                });

                return (
                  isPackageable && (
                    <tr
                      onClick={() => setSelectedItem(itemId)}
                      className={bgClassName}
                      key={item.id}
                    >
                      <td>{item.productName}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unit}</td>
                      <td>
                        <select
                          ref={(el) => {
                            if (rowsRef.current) {
                              rowsRef.current[itemId].quality = el;
                            }
                          }}
                          value={packagingData[itemId].quality}
                          onChange={(e) => {
                            setPackagingData((prev) =>
                              update(prev, {
                                [item.id!]: {
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
                              rowsRef.current[item.id!].packer = el;
                            }
                          }}
                          value={packagingData[item.id!].packerId}
                          onChange={(e) => {
                            setPackagingData((prev) =>
                              update(prev, {
                                [item.id!]: {
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
                              rowsRef.current[item.id!].date = el;
                            }
                          }}
                          type='date'
                          value={packagingData[item.id!].date}
                          onChange={(e) => {
                            setPackagingData((prev) =>
                              update(prev, {
                                [item.id!]: { date: { $set: e.target.value } },
                              }),
                            );
                          }}
                        />
                      </td>
                      <td>
                        <textarea
                          ref={(el) => {
                            if (rowsRef.current) {
                              rowsRef.current[item.id!].comment = el;
                            }
                          }}
                          placeholder='Komentarz'
                          className='disabled:cursor-not-allowed'
                          disabled={packagingData[item.id!].quality >= 8}
                          value={
                            packagingData[item.id!].quality >= 8
                              ? 'n/d'
                              : packagingData[item.id!].comment
                          }
                          onChange={(e) => {
                            setPackagingData((prev) =>
                              update(prev, {
                                [item.id!]: {
                                  comment: { $set: e.target.value },
                                },
                              }),
                            );
                          }}
                        />
                      </td>
                      <td>
                        <button
                          className={
                            saving && itemId === lastSaved
                              ? 'disabled'
                              : 'confirm'
                          }
                          disabled={saving && itemId === lastSaved}
                          onClick={() => saveData(itemId)}
                        >
                          {itemId === lastSaved
                            ? saving
                              ? 'Zapisywanie...'
                              : 'Zapisano (ENTER)'
                            : 'Zapisz (ENTER)'}
                        </button>
                      </td>
                    </tr>
                  )
                );
              })}
            </tbody>
          </table>

          <div className='mt-10'>
            <table className='mx-auto text-xl'>
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
        </>
      ) : (
        <>
          {status === Status.LOADING && <h1>Ładowanie danych oferty...</h1>}
          {status === Status.EMPTY && <h1>Oferta jest pusta</h1>}
        </>
      )}
    </div>
  );
}
