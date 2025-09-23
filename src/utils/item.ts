import { Item } from '@/api/comarch/item.ts';
import { PRICES_TYPE_MAP, PriceType } from '@/data/comarch/prices.ts';
import { roundMoney } from '@/utils/money.ts';
import { OrderItem } from '@/models/bitrix/order.ts';

export function convertItemPrices(item: Item, convertTo: PriceType): Item {
  Object.entries(item.prices).forEach(([priceKey, price]) => {
    if (priceKey in PRICES_TYPE_MAP) {
      const priceType = PRICES_TYPE_MAP[priceKey];

      item.prices[priceKey].value = convertItemPrice(
        price.value,
        item.vatRate,
        priceType,
        convertTo,
      );
    }
  });

  return item;
}

export function convertItemPrice(
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
