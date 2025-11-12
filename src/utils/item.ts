import { Item } from '@/api/comarch/item.ts';
import { roundMoney } from '@/utils/money.ts';
import { PriceType } from '@/models/comarch/prices.ts';
import { DEFAULT_PRICE_TYPES } from '@/data/comarch/prices.ts';
import { setAppOption, useGetAppOption } from '@/api/bitrix/appOption.ts';
import { APP_OPTIONS } from '@/data/bitrix/const.ts';
import { useMemo } from 'react';

export function convertItemPrices(item: Item, convertTo: PriceType): Item {
  Object.entries(item.prices).forEach(([priceKey, price]) => {
    item.prices[priceKey].value = convertItemPrice(
      price.value,
      item.vatRate,
      price.type,
      convertTo,
    );
    item.prices[priceKey].type = convertTo;
  });

  return item;
}

export function convertDefaultItemPrices(item: Item): Item {
  Object.entries(item.prices).forEach(([priceKey, price]) => {
    const convertTo = DEFAULT_PRICE_TYPES[priceKey];

    item.prices[priceKey].value = convertItemPrice(
      price.value,
      item.vatRate,
      price.type,
      convertTo,
    );
    item.prices[priceKey].type = convertTo;
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

export function calculateDiscountPrice(
  price: number,
  discount?: number,
): number {
  const discountRate = 1 - (discount ?? 0) / 100;
  return roundMoney(price * discountRate);
}

export function calculateMaxDiscount(
  item: Item,
  priceType: string,
  userMaxDiscount: number,
) {
  const buyPrice = item.prices['zakupu'];
  const selectedPrice = item.prices[priceType];

  // Calculate max discount based on buy price
  let maxDiscountBuyPrice: number;
  if (
    buyPrice.value === 0 ||
    selectedPrice.value === 0 ||
    buyPrice.value >= selectedPrice.value
  ) {
    maxDiscountBuyPrice = 0;
  } else {
    maxDiscountBuyPrice = Math.min(
      (1 - buyPrice.value / selectedPrice.value) * 100,
      100,
    );
  }

  // Final max discount is limited by both the buy price
  // and the discount set on Bitrix
  return Math.min(userMaxDiscount, maxDiscountBuyPrice);
}

export async function setTemplateItems(templateItems: Array<string>) {
  return setAppOption(APP_OPTIONS.templateItems, JSON.stringify(templateItems));
}

export function useGetTemplateItems(): Array<string> {
  const value = useGetAppOption(APP_OPTIONS.templateItems);
  return useMemo(() => JSON.parse(value), [value]);
}
