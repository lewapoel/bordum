import { RefObject, useContext, useEffect, useState } from 'react';
import { OrderItem, PackagingData } from '@/models/bitrix/order.ts';
import clsx from 'clsx';
import { PRODUCT_TYPES } from '@/data/comarch/product.ts';
import { formatMoney } from '@/utils/money.ts';
import { cn } from '@/lib/utils.ts';
import { OrderContext } from '@/models/order.ts';
import LimitedDiscountTooltip from '@/pages/Order/components/LimitedDiscountTooltip.tsx';

export type RowElements = {
  quantity: HTMLInputElement | null;
  discount: HTMLInputElement | null;
};

export type RowsElements = {
  [key: number]: RowElements;
};

interface SummaryRowProps {
  index: number;
  selectedItem: number;
  item?: OrderItem;
  editItemQuantity: (index: number, quantity: number) => number;
  editItemDiscount: (index: number, discount: number) => number;
  className?: string;
  selectItem: (index: number) => void;
  rowsRef: RefObject<RowsElements | null>;
  packagingData?: PackagingData;
}

export default function SummaryRow({
  index,
  selectItem,
  selectedItem,
  item,
  editItemQuantity,
  editItemDiscount,
  className,
  rowsRef,
  packagingData,
}: SummaryRowProps) {
  const ctx = useContext(OrderContext);

  const [discountDirty, setDiscountDirty] = useState(false);
  const [tempQuantity, setTempQuantity] = useState(item?.quantity ?? '');
  const [tempDiscount, setTempDiscount] = useState(item?.discountRate ?? '');
  const [showDiscountLimited, setShowDiscountLimited] = useState(false);

  const packagingItem = item?.id ? packagingData?.[item.id] : undefined;

  const userMaxDiscount = ctx?.maxDiscount ?? 0;
  const productMaxDiscount = item?.maxDiscount ?? 0;
  const finalMaxDiscount = Math.floor(
    Math.min(userMaxDiscount, productMaxDiscount),
  );

  const editDiscountAllowed =
    item &&
    item.maxDiscount &&
    (!item.discountRate || item.discountRate <= finalMaxDiscount) &&
    !packagingItem?.saved &&
    item.bruttoUnitPrice !== undefined;

  useEffect(() => {
    if (tempQuantity !== '' && +tempQuantity > 0) {
      setTempQuantity(editItemQuantity(index, +tempQuantity) ?? '');
    }
  }, [tempQuantity, editItemQuantity, index]);

  useEffect(() => {
    if (editDiscountAllowed && tempDiscount !== '' && +tempDiscount >= 0) {
      setTempDiscount(editItemDiscount(index, +tempDiscount) ?? '');
    }
  }, [editDiscountAllowed, tempDiscount, editItemDiscount, index]);

  useEffect(() => {
    if (discountDirty && tempDiscount !== '' && +tempDiscount >= 0) {
      if (
        userMaxDiscount > productMaxDiscount &&
        finalMaxDiscount === +tempDiscount
      ) {
        setShowDiscountLimited(true);
      }
    }
  }, [
    discountDirty,
    tempDiscount,
    userMaxDiscount,
    productMaxDiscount,
    finalMaxDiscount,
  ]);

  useEffect(() => {
    setShowDiscountLimited(false);
  }, [selectedItem]);

  return (
    <tr
      onClick={() => {
        selectItem(index);
      }}
      className={clsx(
        selectedItem === index ? 'bg-gray-300' : '',
        'cursor-pointer',
        className,
      )}
    >
      <td>{index + 1}</td>
      <td>{item?.productName}</td>
      <td>
        {item ? (item.type !== undefined ? PRODUCT_TYPES[item.type] : '-') : ''}
      </td>
      <td className={!item || packagingItem?.saved ? '' : 'bg-green-200'}>
        {item ? (
          <input
            disabled={packagingItem?.saved}
            ref={(el) => {
              if (rowsRef.current?.[index]) {
                rowsRef.current[index].quantity = el;
              }
            }}
            className='w-[100px] text-center'
            type='number'
            min={1}
            value={tempQuantity}
            onChange={(e) => setTempQuantity(e.target.value)}
          />
        ) : (
          <></>
        )}
      </td>
      <td>{item?.unit}</td>
      <td
        className={cn(!editDiscountAllowed ? '' : 'bg-green-200', 'relative')}
      >
        {item ? (
          <>
            <LimitedDiscountTooltip
              productMaxDiscount={item.maxDiscount ?? 0}
              userMaxDiscount={ctx?.maxDiscount ?? 0}
              open={showDiscountLimited}
              setOpen={setShowDiscountLimited}
            />
            <input
              disabled={!editDiscountAllowed}
              ref={(el) => {
                if (rowsRef.current?.[index]) {
                  rowsRef.current[index].discount = el;
                }
              }}
              className='w-[100px] text-center'
              type='number'
              min={0}
              value={tempDiscount}
              onChange={(e) => {
                setTempDiscount(e.target.value);
                setDiscountDirty(true);
              }}
            />
          </>
        ) : (
          <></>
        )}
      </td>
      <td>{item ? formatMoney(item.unitPrice) : null}</td>
      <td>{item ? formatMoney(item.unitPrice * item.quantity) : null}</td>
    </tr>
  );
}
