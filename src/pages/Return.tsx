import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ImageGallery from 'react-image-gallery';
import { getCurrentPlacementId } from '../utils/bitrix24.ts';
import { ReturnData, ReturnImage } from '../models/bitrix/deal.ts';
import { getDeal, updateDealReturnData } from '../api/bitrix/deal.ts';
import update from 'immutability-helper';
import ReactImageGallery from 'react-image-gallery';
import { deleteFile, folderUploadFile } from '../api/bitrix/disk.ts';
import { RETURNS_FOLDER_ID } from '../data/bitrix/const.ts';
import { blobToBase64 } from '../utils/blob.ts';

type Galleries = { [key: string]: ReactImageGallery | null };

type RowElements = {
  quantity: HTMLInputElement | null;
  reason: HTMLTextAreaElement | null;
  date: HTMLInputElement | null;
};
type RowsElements = { [key: string]: RowElements };

type PendingImage = {
  file: File;
  previewUrl: string;
};
type PendingImages = { [key: string]: Array<PendingImage> };

type Image = {
  id: number;
  url: string;
  isPending: boolean;
};
type Images = { [key: string]: Array<Image> };

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
  const [originalReturnData, setOriginalReturnData] = useState<ReturnData>();
  const [returnData, setReturnData] = useState<ReturnData>();
  const [pendingImages, setPendingImages] = useState<PendingImages>({});

  const [galleryFullscreen, setGalleryFullscreen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryItemId, setGalleryItemId] = useState('');

  const rowsRef = useRef<RowsElements>(null);
  const galleryRef = useRef<Galleries>(null);

  const images: Images = useMemo(() => {
    const result: Images = {};

    if (returnData) {
      Object.entries(returnData).forEach(([key, item]) => {
        result[key] = item.images.map((image) => ({
          id: image.id,
          url: image.url,
          isPending: false,
        }));
      });
    }

    Object.entries(pendingImages).forEach(([key, item]) => {
      const pendingItems = item.map((x, idx) => ({
        id: idx,
        url: x.previewUrl,
        isPending: true,
      }));
      result[key].push(...pendingItems);
    });

    return result;
  }, [pendingImages, returnData]);

  const saveData = useCallback(async () => {
    if (!returnData || !originalReturnData) {
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

    // Delete removed images from disk
    const imagesToRemove: Array<ReturnImage> = [];
    Object.entries(originalReturnData).forEach(([key, item]) => {
      const newData = returnData[key];

      // If the whole row is gone, remove all images
      if (!newData) {
        imagesToRemove.push(...item.images);
      } else {
        const newImages = newData.images.map((image) => image.id);
        imagesToRemove.push(
          ...item.images.filter((image) => !newImages.includes(image.id)),
        );
      }
    });

    for (const image of imagesToRemove) {
      await deleteFile(image.id);
    }

    for (const [key, images] of Object.entries(pendingImages)) {
      for (const image of images) {
        const imageData = await blobToBase64(image.file);

        const file = await folderUploadFile(RETURNS_FOLDER_ID, [
          image.file.name,
          imageData,
        ]);
        if (!file) {
          return;
        }

        returnData[key].images.push({
          id: file.id,
          url: file.downloadUrl,
        });
      }
    }

    setStatus(Status.SAVING);
    updateDealReturnData(placementId, returnData).then(() => {
      setStatus(Status.LOADED);
    });
  }, [returnData, originalReturnData, placementId, pendingImages]);

  const removeItem = useCallback(() => {
    if (returnData) {
      setReturnData((prev) => update(prev, { $unset: [selectedItem] }));
    }

    setPendingImages((prev) => update(prev, { $unset: [selectedItem] }));
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
        case '1':
          if (e.altKey) {
            void saveData();
          }
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

  const handleImageChange = (
    itemId: string,
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files) {
      const files = [...e.target.files];
      const images = files.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      setPendingImages((prev) => update(prev, { [itemId]: { $push: images } }));
      e.target.value = '';
    }
  };

  const handleImageRemove = useCallback(
    (itemId: string) => {
      const image = images[itemId][galleryIndex];

      if (image.isPending) {
        setPendingImages((prev) =>
          update(prev, { [itemId]: { $splice: [[image.id, 1]] } }),
        );
        URL.revokeObjectURL(image.url);
      } else if (returnData) {
        const imageIndex = returnData[itemId].images.findIndex(
          (x) => x.id === image.id,
        );
        setReturnData((prev) =>
          update(prev, {
            [itemId]: { images: { $splice: [[imageIndex, 1]] } },
          }),
        );
      }

      galleryRef.current?.[itemId]?.exitFullScreen();
    },
    [images, galleryIndex, returnData],
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

          galleryRef.current = Object.keys(res.returnData).reduce(
            (acc: Galleries, key) => {
              acc[key] = null;
              return acc;
            },
            {},
          );

          setPendingImages(
            Object.keys(res.returnData).reduce((acc: PendingImages, key) => {
              acc[key] = [];
              return acc;
            }, {}),
          );

          setOriginalReturnData(res.returnData);
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
              Zapisz (Alt+1)
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
                <th>Dodaj zdjęcie</th>
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
                  <td>
                    {images[itemId].length === 0 ? (
                      <p>Brak zdjęć</p>
                    ) : (
                      <>
                        {galleryFullscreen &&
                          galleryItemId === itemId &&
                          images[itemId][galleryIndex].isPending && (
                            <p className='text-shadow-lg text-white top-5 left-5 fixed z-10 '>
                              Nowe zdjęcie (niezapisane)
                            </p>
                          )}
                        {galleryFullscreen && galleryItemId === itemId && (
                          <button
                            onClick={() => handleImageRemove(itemId)}
                            className='delete top-5 right-5 fixed z-10'
                          >
                            Usuń zdjęcie
                          </button>
                        )}
                        <ImageGallery
                          additionalClass={galleryFullscreen ? '' : 'hidden'}
                          showPlayButton={false}
                          useBrowserFullscreen={false}
                          ref={(el) => {
                            if (galleryRef.current) {
                              galleryRef.current[itemId] = el;
                            }
                          }}
                          onBeforeSlide={(index) => setGalleryIndex(index)}
                          onScreenChange={(fullscreen) => {
                            setGalleryFullscreen(fullscreen);
                            setGalleryItemId(itemId);
                            galleryRef.current?.[itemId]?.slideToIndex(0);
                          }}
                          items={images[itemId].map((image) => ({
                            original: image.url,
                            thumbnail: image.url,
                          }))}
                        />
                        <button
                          onClick={() =>
                            galleryRef.current?.[itemId]?.fullScreen()
                          }
                        >
                          Otwórz galerię
                        </button>
                      </>
                    )}
                  </td>
                  <td>
                    <input
                      id={`files-${itemId}`}
                      type='file'
                      accept='image/*'
                      multiple
                      className='hidden'
                      onChange={(e) => handleImageChange(itemId, e)}
                    />
                    <button
                      type='button'
                      onClick={(e) => {
                        // Propagate button click to the label
                        const element: HTMLButtonElement = e.currentTarget;
                        const label = element.querySelector('label');

                        label?.click();
                      }}
                    >
                      <label
                        className='pointer-events-none'
                        htmlFor={`files-${itemId}`}
                      >
                        Wybierz plik
                      </label>
                    </button>
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
