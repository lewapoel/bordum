import { PriceType } from '@/models/comarch/prices.ts';

export const PRICES = [
  'zakupu',
  'hurtowa 1',
  'hurtowa 2',
  'hurtowa 3',
  'detaliczna',
] as const;

export const DEFAULT_PRICE = PRICES[0];

export const DEFAULT_PRICE_TYPES: { [key: string]: PriceType } = {
  zakupu: PriceType.NETTO,
  'hurtowa 1': PriceType.NETTO,
  'hurtowa 2': PriceType.NETTO,
  'hurtowa 3': PriceType.NETTO,
  detaliczna: PriceType.BRUTTO,
};
