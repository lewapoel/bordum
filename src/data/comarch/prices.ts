export const PRICES = [
  'zakupu',
  'hurtowa 1',
  'hurtowa 2',
  'hurtowa 3',
  'detaliczna',
] as const;

export const DEFAULT_PRICE = PRICES[0];

export enum PriceType {
  NETTO = 1,
  BRUTTO = 2,
}

export type Price = {
  number: number;
  value: number;
  currency: string;
  type: PriceType;
};

export type Prices = { [key: string]: Price };
