import { Item } from '@/api/comarch/item.ts';
import { PRICES_TYPE_MAP, PriceType } from '@/data/comarch/prices.ts';
import { roundMoney } from '@/utils/money.ts';

export function convertItemPrices(item: Item, convertTo: PriceType): Item {
  Object.entries(item.prices).forEach(([priceKey, price]) => {
    if (priceKey in PRICES_TYPE_MAP) {
      const priceType = PRICES_TYPE_MAP[priceKey];
      let multiplier = 1;

      if (convertTo === PriceType.BRUTTO && priceType === PriceType.NETTO) {
        multiplier = 1 + item.vatRate / 100;
      } else if (
        convertTo === PriceType.NETTO &&
        priceType === PriceType.BRUTTO
      ) {
        multiplier = 100 / (100 + item.vatRate);
      }

      item.prices[priceKey].value = roundMoney(price.value * multiplier);
    }
  });

  return item;
}
