import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import { Highlight, useFuzzySearchList } from '@nozbe/microfuzz/react';
import { Item } from '@/api/comarch/item.ts';
import { HighlightRanges } from '@nozbe/microfuzz';
import { useGetTemplateItems, setTemplateItems } from '@/utils/item.ts';
import update from 'immutability-helper';
import { toast } from 'react-toastify';

type Match = {
  item: Item;
  highlightRanges: HighlightRanges | null;
};

interface EditTemplateItemsProps {
  setVisible: Dispatch<SetStateAction<boolean>>;
  items: Array<Item> | null;
}

export default function EditTemplateItems({
  setVisible,
  items,
}: EditTemplateItemsProps) {
  const searchBarRef = useRef<HTMLInputElement>(null);
  const currentTemplateItems = useGetTemplateItems();

  const [showOther, setShowOther] = useState(true);
  const [selectedItem, setSelectedItem] = useState(0);
  const [temporarySearch, setTemporarySearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(
    () =>
      items
        ? items
            .toSorted((a, b) => {
              const aIsTemplate = currentTemplateItems.includes(a.code);
              const bIsTemplate = currentTemplateItems.includes(b.code);

              if (aIsTemplate && !bIsTemplate) return -1;
              if (!aIsTemplate && bIsTemplate) return 1;

              return a.name.localeCompare(b.name);
            })
            .filter(
              (item) => showOther || currentTemplateItems.includes(item.code),
            )
        : null,
    [items, currentTemplateItems, showOther],
  );

  const searchList = useFuzzySearchList<Item, Match>({
    list: filteredItems ?? [],
    queryText: searchTerm,
    key: 'name',
    mapResultItem: ({ item, matches: [highlightRanges] }) => ({
      item,
      highlightRanges,
    }),
  });

  const addItem = useCallback(async () => {
    if (selectedItem >= 0 && selectedItem < searchList.length) {
      const code = searchList[selectedItem].item.code;

      await toast.promise(
        async () => {
          return await setTemplateItems(
            update(currentTemplateItems, { $push: [code] }),
          );
        },
        {
          pending: 'Dodawanie przedmiotu...',
        },
        {
          position: 'top-center',
          theme: 'light',
        },
      );
    }
  }, [selectedItem, searchList, currentTemplateItems]);

  const deleteItem = useCallback(async () => {
    if (selectedItem >= 0 && selectedItem < searchList.length) {
      const code = searchList[selectedItem].item.code;
      const idx = currentTemplateItems.indexOf(code);

      if (idx !== -1) {
        await toast.promise(
          async () => {
            return await setTemplateItems(
              update(currentTemplateItems, { $splice: [[idx, 1]] }),
            );
          },
          {
            pending: 'Usuwanie przedmiotu...',
          },
          {
            position: 'top-center',
            theme: 'light',
          },
        );
      }
    }
  }, [selectedItem, searchList, currentTemplateItems]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': {
          e.preventDefault();

          const newSelectedItem = Math.max(0, selectedItem - 1);
          setSelectedItem(newSelectedItem);

          break;
        }
        case 'ArrowDown': {
          e.preventDefault();

          const newSelectedItem = Math.min(
            searchList.length - 1,
            selectedItem + 1,
          );
          setSelectedItem(newSelectedItem);

          break;
        }
        case 'Enter':
          void addItem();
          break;
        case 'Delete':
          void deleteItem();
          break;
        case '1':
          if (e.altKey) {
            setShowOther((prev) => !prev);
          }
          break;
        case 'Escape':
          setVisible(false);
          break;
        case '=':
          e.preventDefault();
          setSearchTerm(temporarySearch);

          break;
        default:
          break;
      }
    },
    [
      selectedItem,
      temporarySearch,
      searchList.length,
      setVisible,
      addItem,
      deleteItem,
    ],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div>
      <h1 className='mb-5'>Edycja niestandardowych pozycji</h1>

      <div className='justify-center flex items-center gap-2 mb-10'>
        <button className='confirm' onClick={() => setVisible(false)}>
          Powrót do wyboru towaru (ESC)
        </button>
        <button onClick={() => deleteItem()} className='delete'>
          Usuń zaznaczoną pozycję (DELETE)
        </button>
      </div>

      <div className='text-[20px] justify-center flex items-center gap-4 mb-10'>
        <p>Zmień zaznaczoną pozycję (↑/↓)</p>
        <p>Dodaj pozycję (ENTER)</p>
        <p>Pokaż/ukryj pozostałe pozycje (Alt+1)</p>
      </div>

      <div className='flex items-center gap-4'>
        <input
          ref={searchBarRef}
          type='text'
          placeholder='Wyszukaj towar...'
          value={temporarySearch}
          onChange={(e) => {
            setTemporarySearch(e.target.value);
          }}
          className='searchbar w-full'
        />

        <button
          className='confirm shrink-0'
          onClick={() => setSearchTerm(temporarySearch)}
        >
          Szukaj (=)
        </button>
      </div>
      <table>
        <thead className='bg-white freeze'>
          <tr>
            <th>Nazwa</th>
            <th>Jedn. miary</th>
          </tr>
        </thead>
        <tbody>
          {searchList.map(({ item, highlightRanges }, idx) => {
            const isSelected = idx === selectedItem;
            const isTemplate = currentTemplateItems.includes(item.code);

            const bgClassName = clsx({
              'bg-gray-300': isSelected,
              'bg-green-200': isTemplate,
              'bg-green-300': isSelected && isTemplate,
            });

            return (
              <tr
                key={item.id}
                className={bgClassName}
                onClick={() => {
                  setSelectedItem(idx);
                }}
              >
                <td>
                  <Highlight text={item.name} ranges={highlightRanges} />
                </td>
                <td>{item.unit}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
