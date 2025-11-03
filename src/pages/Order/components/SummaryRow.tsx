import { RefObject, useEffect, useState } from 'react';
import { OrderItem, PackagingData } from '@/models/bitrix/order.ts';
import clsx from 'clsx';
import { PRODUCT_TYPES } from '@/data/comarch/product.ts';
import { formatMoney } from '@/utils/money.ts';

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
  const [tempQuantity, setTempQuantity] = useState(item?.quantity ?? '');
  const [tempDiscount, setTempDiscount] = useState(item?.discountRate ?? '');
  const packagingItem = item?.id ? packagingData?.[item.id] : undefined;

  useEffect(() => {
    if (tempQuantity !== '' && +tempQuantity > 0) {
      setTempQuantity(editItemQuantity(index, +tempQuantity) ?? '');
    }
  }, [tempQuantity, editItemQuantity, index]);

  useEffect(() => {
    if (tempDiscount !== '' && +tempDiscount >= 0) {
      setTempDiscount(editItemDiscount(index, +tempDiscount) ?? '');
    }
  }, [tempDiscount, editItemDiscount, index]);

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
        className={
          !item ||
          packagingItem?.saved ||
          !item.maxDiscount ||
          item.bruttoUnitPrice === undefined
            ? ''
            : 'bg-green-200'
        }
      >
        {item ? (
          <input
            disabled={
              packagingItem?.saved ||
              !item.maxDiscount ||
              item.bruttoUnitPrice === undefined
            }
            ref={(el) => {
              if (rowsRef.current?.[index]) {
                rowsRef.current[index].discount = el;
              }
            }}
            className='w-[100px] text-center'
            type='number'
            min={0}
            max={item.maxDiscount ?? 0}
            value={tempDiscount}
            onChange={(e) => setTempDiscount(e.target.value)}
          />
        ) : (
          <></>
        )}
      </td>
      <td>{item ? formatMoney(item.unitPrice) : null}</td>
      <td>{item ? formatMoney(item.unitPrice * item.quantity) : null}</td>
    </tr>
  );
}
