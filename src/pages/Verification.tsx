import ReactDOMServer from 'react-dom/server';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getCurrentPlacementId } from '../utils/bitrix24.ts';
import {
  getOrder,
  splitOrder,
  updateOrderVerificationData,
  updateOrderVerificationDocuments,
} from '../api/bitrix/order.ts';
import update from 'immutability-helper';
import {
  OrderData,
  OrderItem,
  VerificationData,
} from '../models/bitrix/order.ts';
import { useGetStocks } from '../api/comarch/stock.ts';
import { Document, Font, Page, pdf } from '@react-pdf/renderer';
import Html from 'react-pdf-html';
import { blobToBase64 } from '../utils/blob.ts';
import { BitrixFile } from '../models/bitrix/disk.ts';
import { QUOTE_STATUSES } from '../data/bitrix/const.ts';
import { useGetItemsGroups } from '../api/comarch/item.ts';
import { AuthContext } from '../components/AuthContext.tsx';

type RowElements = {
  copyStock: HTMLButtonElement | null;
  actualStock: HTMLInputElement | null;
  qualityGoods: HTMLInputElement | null;
  comment: HTMLTextAreaElement | null;
};

type RowsElements = { [key: string]: RowElements };

type GroupItems = {
  groupName: string;
  items: Array<OrderItem>;
};

type GroupsItems = { [key: string]: GroupItems };

enum Status {
  EMPTY,
  LOADING,
  LOADED,
  INVALID,
  SAVING,
}

const SECRET_URL_PARAM = import.meta.env.SECRET_URL_PARAM;

Font.register({
  family: 'NotoSans',
  fonts: [
    {
      src: `/fonts/NotoSans-Thin.ttf?${SECRET_URL_PARAM}`,
      fontWeight: 100,
    },
    {
      src: `/fonts/NotoSans-ExtraLight.ttf?${SECRET_URL_PARAM}`,
      fontWeight: 200,
    },
    {
      src: `/fonts/NotoSans-Light.ttf?${SECRET_URL_PARAM}`,
      fontWeight: 300,
    },
    {
      src: `/fonts/NotoSans-Regular.ttf?${SECRET_URL_PARAM}`,
      fontWeight: 400,
    },
    {
      src: `/fonts/NotoSans-Medium.ttf?${SECRET_URL_PARAM}`,
      fontWeight: 500,
    },
    {
      src: `/fonts/NotoSans-SemiBold.ttf?${SECRET_URL_PARAM}`,
      fontWeight: 600,
    },
    {
      src: `/fonts/NotoSans-Bold.ttf?${SECRET_URL_PARAM}`,
      fontWeight: 700,
    },
    {
      src: `/fonts/NotoSans-ExtraBold.ttf?${SECRET_URL_PARAM}`,
      fontWeight: 800,
    },
    {
      src: `/fonts/NotoSans-Black.ttf?${SECRET_URL_PARAM}`,
      fontWeight: 900,
    },
  ],
});

export default function Verification() {
  const { token } = useContext(AuthContext);
  const placementId = getCurrentPlacementId();
  const [order, setOrder] = useState<OrderData>();
  const [status, setStatus] = useState<Status>(Status.LOADING);
  const [selectedItem, setSelectedItem] = useState('0');
  const [verificationData, setVerificationData] = useState<VerificationData>();

  const stocksQuery = useGetStocks(token, 1);
  const stocks = stocksQuery.data;
  const itemsGroupsQuery = useGetItemsGroups(token);
  const itemsGroups = itemsGroupsQuery.data;

  const rowsRef = useRef<RowsElements>(null);

  const saveData = useCallback(() => {
    if (!verificationData) {
      return;
    }

    setStatus(Status.SAVING);
    updateOrderVerificationData(placementId, verificationData).then(() => {
      setStatus(Status.LOADED);
    });
  }, [verificationData, placementId]);

  const generatePdfHtml = useCallback(
    (group: GroupItems) => {
      if (!verificationData) {
        return '';
      }

      const element = (
        <html>
          <body>
            <h1 style={{ textAlign: 'center' }}>{group.groupName}</h1>

            <table>
              <thead>
                <tr>
                  <th>Nazwa towaru</th>
                  <th>Jedn. miary</th>
                  <th>Ilość do zamówienia</th>
                  <th>Komentarz</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => {
                  const qualityGoods =
                    +verificationData[item.id!.toString()].qualityGoods || 0;

                  return (
                    <tr key={item.id}>
                      <td>{item.productName}</td>
                      <td>{item.unit}</td>
                      <td>{Math.max(0, item.quantity - qualityGoods)}</td>
                      <td>{verificationData[item.id!].comment}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </body>
        </html>
      );

      return ReactDOMServer.renderToStaticMarkup(element);
    },
    [verificationData],
  );

  const generatePdfs = useCallback(async () => {
    if (!placementId || !order) {
      alert('Nie udało się pobrać danych oferty');
      return;
    }
    setStatus(Status.SAVING);

    const stylesheet = {
      body: {
        fontFamily: 'NotoSans',
        fontSize: '12px',
      },
      ['table, th, td']: {
        border: '1px solid black',
        borderCollapse: 'collapse',
      },
      ['th:nth-child(1), td:nth-child(1)']: {
        width: '40%',
      },
      ['th:nth-child(2), td:nth-child(2)']: {
        width: '10%',
      },
      ['th:nth-child(3), td:nth-child(3)']: {
        width: '20%',
      },
      ['th:nth-child(4), td:nth-child(4)']: {
        width: '30%',
      },
    };

    const itemsByGroups = order.items.reduce((acc: GroupsItems, item) => {
      if (itemsGroups) {
        if (!acc[item.groupId]) {
          acc[item.groupId] = {
            groupName: itemsGroups[item.groupId].name,
            items: [item],
          };
        } else {
          acc[item.groupId].items.push(item);
        }
      }

      return acc;
    }, {});

    const files: Array<BitrixFile> = [];

    for (const group of Object.values(itemsByGroups)) {
      const pdfDocument = (
        <Document>
          <Page size='A4' orientation='landscape'>
            <Html stylesheet={stylesheet}>{generatePdfHtml(group)}</Html>
          </Page>
        </Document>
      );

      const blob = await pdf(pdfDocument).toBlob();
      const pdfBase64 = await blobToBase64(blob);

      files.push([`${group.groupName}.pdf`, pdfBase64]);
    }

    updateOrderVerificationDocuments(placementId, files).then(() => {
      setStatus(Status.LOADED);
      alert('Utworzono dokumenty pomyślnie');
    });
  }, [order, generatePdfHtml, placementId, itemsGroups]);

  const generateOrder = useCallback(() => {
    if (!placementId || !order || !verificationData) {
      alert('Nie udało się pobrać danych oferty');
      return;
    }
    setStatus(Status.SAVING);

    const newOrder = order.items
      .map((item) => {
        const qualityGoods =
          +verificationData[item.id!.toString()].qualityGoods || 0;
        const orderQuantity = Math.max(
          0,
          Math.min(item.quantity, qualityGoods),
        );

        return { ...item, quantity: orderQuantity };
      })
      .filter((item) => item.quantity > 0);

    const subOrder = order.items
      .map((item) => {
        const qualityGoods =
          +verificationData[item.id!.toString()].qualityGoods || 0;
        const orderQuantity = Math.max(0, item.quantity - qualityGoods);

        return { ...item, quantity: orderQuantity };
      })
      .filter((item) => item.quantity > 0);

    splitOrder(placementId, {
      title: 'braki',
      subStatusId: QUOTE_STATUSES.WAITING_FOR_SHORTAGES,
      statusId: QUOTE_STATUSES.READY_TO_PACK,
      subOrder,
      order: newOrder,
    }).then(() => {
      setStatus(Status.LOADED);
    });
  }, [placementId, order, verificationData]);

  const getFullCategoryName = useCallback(
    (groupId: string) => {
      const result: Array<string> = [];
      let currentItem = itemsGroups?.[groupId];

      while (currentItem) {
        result.push(currentItem.name);
        currentItem = currentItem.parent;
      }

      return result.reverse().join(' > ');
    },
    [itemsGroups],
  );

  const updateQualityGoods = useCallback(
    (itemId: number, actualStock: number, newValue?: string | number) => {
      if (stocks) {
        const isInvalidValue =
          newValue !== undefined && (isNaN(+newValue) || newValue === '');

        setVerificationData((prev) =>
          update(prev, {
            [itemId]: {
              qualityGoods: {
                $set: isInvalidValue
                  ? newValue
                  : Math.min(
                      actualStock,
                      Math.max(
                        0,
                        Number(newValue) ||
                          Number(prev?.[itemId]?.qualityGoods) ||
                          0,
                      ),
                    ),
              },
            },
          }),
        );
      }
    },
    [stocks],
  );

  const updateActualStock = useCallback(
    (itemId: number, newValue: string | number) => {
      if (stocks) {
        const isInvalidValue = isNaN(+newValue) || newValue === '';
        const newActualStock = isInvalidValue
          ? newValue
          : Math.max(0, +newValue);

        setVerificationData((prev) =>
          update(prev, {
            [itemId]: {
              actualStock: {
                $set: newActualStock,
              },
            },
          }),
        );

        updateQualityGoods(itemId, +newActualStock || 0);
      }
    },
    [stocks, updateQualityGoods],
  );

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
        case '1':
          if (e.altKey) {
            saveData();
          }
          break;
        case '2':
          if (e.altKey) {
            void generatePdfs();
          }
          break;
        case '3':
          if (e.altKey) {
            generateOrder();
          }
          break;
        case 'Tab':
          e.preventDefault();

          if (rowsRef.current) {
            const selectedRow = rowsRef.current[selectedItem];

            switch (document.activeElement) {
              case selectedRow.copyStock:
                selectedRow.actualStock?.focus();
                selectedRow.actualStock?.select();
                break;

              case selectedRow.actualStock:
                selectedRow.qualityGoods?.focus();
                selectedRow.qualityGoods?.select();
                break;

              case selectedRow.qualityGoods:
                selectedRow.comment?.focus();
                break;

              default:
                selectedRow.copyStock?.focus();
                break;
            }
          }

          break;
        default:
          break;
      }
    },
    [selectedItem, saveData, verificationData, generatePdfs, generateOrder],
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
        if (res.items.length === 0 || !res.verificationData) {
          setStatus(Status.EMPTY);
        } else if (
          res.items.some((item) => item.itemId === '' || item.groupId === '')
        ) {
          setStatus(Status.INVALID);
        } else {
          res.items = res.items.filter((item) =>
            Object.keys(res.verificationData!).includes(item.id!.toString()),
          );
          setOrder(res);

          rowsRef.current = res.items.reduce((acc: RowsElements, item) => {
            acc[item.id!.toString()] = {
              copyStock: null,
              actualStock: null,
              qualityGoods: null,
              comment: null,
            };

            return acc;
          }, {});

          setVerificationData(res.verificationData);
        }
      }
    });
  }, [placementId]);

  useEffect(() => {
    if (
      order &&
      verificationData &&
      !stocksQuery.isLoading &&
      !itemsGroupsQuery.isLoading &&
      status === Status.LOADING
    ) {
      setStatus(Status.LOADED);
    }
  }, [order, verificationData, stocksQuery, itemsGroupsQuery, status]);

  return (
    <div>
      {status === Status.LOADED &&
      verificationData &&
      order &&
      stocks &&
      itemsGroups ? (
        <>
          <h1 className='mb-5'>Weryfikacja stanu</h1>

          <div className='justify-center flex items-center gap-2 mb-5'>
            <button onClick={() => generatePdfs()}>
              Wygeneruj braki (Alt+2)
            </button>

            <button onClick={() => generateOrder()}>
              Wydziel braki do oferty (Alt+3)
            </button>
          </div>

          <div className='justify-center flex items-center gap-2 mb-10'>
            <button className='confirm' onClick={() => saveData()}>
              Zapisz (Alt+1)
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
              {order.items.map((item) => {
                const verification = verificationData[item.id!.toString()];

                const qualityGoods = +verification.qualityGoods || 0;
                const actualStock = +verification.actualStock || 0;

                const orderQuantity = Math.max(0, item.quantity - qualityGoods);

                return (
                  <tr
                    onClick={() => setSelectedItem(item.id!.toString())}
                    className={
                      selectedItem === item.id!.toString() ? 'bg-gray-300' : ''
                    }
                    key={item.id}
                  >
                    <td>{item.productName}</td>
                    <td>{getFullCategoryName(item.groupId)}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unit}</td>
                    <td>{stocks[+item.itemId].quantity}</td>
                    <td>
                      <div className='flex gap-2 justify-between items-center'>
                        <input
                          type='number'
                          className='w-[100px]'
                          min={0}
                          ref={(el) => {
                            if (rowsRef.current) {
                              rowsRef.current[item.id!.toString()].actualStock =
                                el;
                            }
                          }}
                          value={verification.actualStock}
                          onChange={(e) =>
                            updateActualStock(item.id!, e.target.value)
                          }
                        />
                        <button
                          ref={(el) => {
                            if (rowsRef.current) {
                              rowsRef.current[item.id!.toString()].copyStock =
                                el;
                            }
                          }}
                          className='small'
                          onClick={() =>
                            updateActualStock(
                              item.id!,
                              stocks[+item.itemId].quantity,
                            )
                          }
                        >
                          OK
                        </button>
                      </div>
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
                        value={verification.qualityGoods}
                        onChange={(e) =>
                          updateQualityGoods(
                            item.id!,
                            actualStock,
                            e.target.value,
                          )
                        }
                      />
                    </td>
                    <td>{orderQuantity}</td>
                    <td>
                      <textarea
                        ref={(el) => {
                          if (rowsRef.current) {
                            rowsRef.current[item.id!].comment = el;
                          }
                        }}
                        placeholder='Komentarz'
                        value={verification.comment}
                        onChange={(e) => {
                          setVerificationData((prev) =>
                            update(prev, {
                              [item.id!]: {
                                comment: { $set: e.target.value },
                              },
                            }),
                          );
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
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
          {status === Status.SAVING && <h1>Zapisywanie danych...</h1>}
        </>
      )}
    </div>
  );
}
