import {
  calculateMaxDiscount,
  calculateProductMaxDiscount,
} from '@/utils/item.ts';
import clsx from 'clsx';
import update from 'immutability-helper';
import { Highlight } from '@nozbe/microfuzz/react';
import {
  Dispatch,
  Fragment,
  RefObject,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react';
import { formatMoney } from '@/utils/money.ts';
import { ItemWarehouses } from '@/api/comarch/item.ts';
import { HighlightRanges } from '@nozbe/microfuzz';
import { OrderContext } from '@/models/order.ts';
import { cn } from '@/lib/utils.ts';
import LimitedDiscountTooltip from '@/pages/Order/components/LimitedDiscountTooltip.tsx';

export type RowElements = {
  name: HTMLInputElement | null;
  unit: HTMLInputElement | null;
  quantity: HTMLInputElement | null;
  discount: HTMLInputElement | null;
};

export type RowsElements = {
  [key: number]: RowElements;
};

export type Match = {
  item: ItemWarehouses;
  highlightRanges: HighlightRanges | null;
};

export type Quantities = {
  [key: number]: string;
};

export type Discounts = {
  [key: number]: string;
};

interface ItemsRowProps {
  match: Match;
  quantities: Quantities;
  discounts: Discounts;
  idx: number;
  selectedItem: number;
  editingItem: number;
  setSelectedItem: Dispatch<SetStateAction<number>>;
  setEditingItem: Dispatch<SetStateAction<number>>;
  rowsRef: RefObject<RowsElements | null>;
  editedItem: ItemWarehouses | undefined;
  setEditedItem: Dispatch<SetStateAction<ItemWarehouses | undefined>>;
  setQuantities: Dispatch<SetStateAction<Quantities>>;
  setDiscounts: Dispatch<SetStateAction<Discounts>>;
}

export default function ItemsRow({
  match,
  quantities,
  discounts,
  idx,
  selectedItem,
  editingItem,
  setSelectedItem,
  setEditingItem,
  rowsRef,
  editedItem,
  setEditedItem,
  setQuantities,
  setDiscounts,
}: ItemsRowProps) {
  const { item, highlightRanges } = match;
  const ctx = useContext(OrderContext);

  const selectedPrice = item.prices[ctx!.selectedPrice!];

  const productMaxDiscount = calculateProductMaxDiscount(
    item,
    ctx!.selectedPrice!,
  );
  const userMaxDiscount = ctx!.maxDiscount ?? 0;

  const quantity = quantities[item.id] ?? '0';
  const discount = discounts[item.id] ?? 0;
  const maxDiscount = calculateMaxDiscount(
    item,
    ctx!.selectedPrice!,
    ctx!.maxDiscount ?? 0,
  );

  const discountMultiplier = 1 - +discount / 100;
  const unitPrice = selectedPrice.value * discountMultiplier;
  const price = unitPrice * +quantity;

  const isSelected = idx === selectedItem;
  const isEditing = idx === editingItem;

  const bgClassName = clsx({
    'bg-gray-300': isSelected,
  });

  const [discountDirty, setDiscountDirty] = useState(false);
  const [showDiscountLimited, setShowDiscountLimited] = useState(false);

  useEffect(() => {
    if (discountDirty && discount !== '' && +discount >= 0) {
      if (userMaxDiscount > productMaxDiscount && maxDiscount === +discount) {
        setShowDiscountLimited(true);
      }
    }
  }, [
    discountDirty,
    discount,
    userMaxDiscount,
    productMaxDiscount,
    maxDiscount,
  ]);

  useEffect(() => {
    setShowDiscountLimited(false);
  }, [selectedItem]);

  return (
    <tr
      key={item.id}
      className={bgClassName}
      onClick={() => {
        setSelectedItem(idx);
        setEditingItem(-1);
      }}
    >
      <td className={isEditing ? 'bg-green-200' : ''}>
        {isEditing ? (
          <input
            ref={(el) => {
              if (rowsRef.current?.[item.id!]) {
                rowsRef.current[item.id!].name = el;
              }
            }}
            className='w-full text-center'
            type='text'
            value={editedItem?.name}
            onChange={(e) => {
              setEditedItem((prev) =>
                update(prev, { name: { $set: e.target.value } }),
              );
            }}
          />
        ) : (
          <Highlight text={item.name} ranges={highlightRanges} />
        )}
      </td>
      {Object.values(item.quantities).map((quantity) => (
        <Fragment key={quantity.warehouseId}>
          <td>{quantity.quantity - quantity.reservation}</td>
          <td>{quantity.reservation}</td>
        </Fragment>
      ))}
      <td className='bg-green-200'>
        <input
          ref={(el) => {
            if (rowsRef.current?.[item.id!]) {
              rowsRef.current[item.id!].quantity = el;
            }
          }}
          className='w-[100px]'
          type='number'
          min={0}
          value={quantity}
          onChange={(e) =>
            setQuantities((prev) =>
              update(prev, {
                [item.id]: { $set: e.target.value },
              }),
            )
          }
        />
      </td>
      <td className={isEditing ? 'bg-green-200' : ''}>
        {isEditing ? (
          <input
            ref={(el) => {
              if (rowsRef.current?.[item.id!]) {
                rowsRef.current[item.id!].unit = el;
              }
            }}
            type='text'
            className='w-[100px] text-center'
            value={editedItem?.unit}
            onChange={(e) =>
              setEditedItem((prev) =>
                update(prev, { unit: { $set: e.target.value } }),
              )
            }
          />
        ) : (
          item.unit
        )}
      </td>
      <td className={cn(maxDiscount ? 'bg-green-200' : '', 'relative')}>
        <LimitedDiscountTooltip
          productMaxDiscount={productMaxDiscount}
          userMaxDiscount={userMaxDiscount}
          open={showDiscountLimited}
          setOpen={setShowDiscountLimited}
        />
        <input
          disabled={!maxDiscount}
          ref={(el) => {
            if (rowsRef.current?.[item.id!]) {
              rowsRef.current[item.id!].discount = el;
            }
          }}
          className='w-[100px]'
          type='number'
          min={0}
          max={maxDiscount}
          value={discount}
          onChange={(e) => {
            setDiscounts((prev) =>
              update(prev, {
                [item.id]: {
                  $set:
                    e.target.value === ''
                      ? ''
                      : Math.min(
                          Math.max(0, +e.target.value),
                          Math.floor(maxDiscount),
                        ).toString(),
                },
              }),
            );
            setDiscountDirty(true);
          }}
        />
      </td>
      <td>{formatMoney(unitPrice)}</td>
      <td>{formatMoney(price)}</td>
    </tr>
  );
}
