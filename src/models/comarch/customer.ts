import { DEFAULT_PRICE } from '../../data/prices.ts';

export enum CustomerDefaultPrice {
  Default = 0,
  Buy,
  Wholesale1,
  Wholesale2,
  Wholesale3,
  Retail,
}

export function getCustomerDefaultPriceName(
  defaultPrice: CustomerDefaultPrice,
): string {
  switch (defaultPrice) {
    case CustomerDefaultPrice.Default:
      return DEFAULT_PRICE;
    case CustomerDefaultPrice.Buy:
      return 'zakupu';
    case CustomerDefaultPrice.Wholesale1:
      return 'hurtowa 1';
    case CustomerDefaultPrice.Wholesale2:
      return 'hurtowa 2';
    case CustomerDefaultPrice.Wholesale3:
      return 'hurtowa 3';
    case CustomerDefaultPrice.Retail:
      return 'detaliczna';
  }
}
