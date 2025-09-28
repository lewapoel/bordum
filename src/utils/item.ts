import { Item } from '@/api/comarch/item.ts';
import { Prices, PriceType } from '@/data/comarch/prices.ts';
import { roundMoney } from '@/utils/money.ts';
import { OrderItem } from '@/models/bitrix/order.ts';
import { entries } from '@/lib/utils.ts';
import { v4 as uuidv4 } from 'uuid';

export function convertItemPrices(item: Item, convertTo: PriceType): Item {
  entries<Prices>(item.prices).forEach(([priceKey, price]) => {
    item.prices[priceKey].value = convertItemPrice(
      price.value,
      item.vatRate,
      price.type,
      convertTo,
    );
  });

  return item;
}

function convertItemPrice(
  value: number,
  vatRate: number,
  convertFrom: PriceType,
  convertTo: PriceType,
): number {
  let multiplier = 1;

  if (convertTo === PriceType.BRUTTO && convertFrom === PriceType.NETTO) {
    multiplier = 1 + vatRate / 100;
  } else if (
    convertTo === PriceType.NETTO &&
    convertFrom === PriceType.BRUTTO
  ) {
    multiplier = 100 / (100 + vatRate);
  }

  return roundMoney(value * multiplier);
}

export function calculateUnitPrice(item: OrderItem): number {
  return roundMoney(item.unitPrice * (1 - (item.discountRate ?? 0) / 100));
}

export function generateItemCode(): string {
  return uuidv4().replace(/-/g, '').slice(0, 32);
}
