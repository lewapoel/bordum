export const PRICES = [
  'detaliczna',
  'hurtowa 1',
  'hurtowa 2',
  'hurtowa 3',
  'zakupu',
] as const;

export const DEFAULT_PRICE = PRICES[0];

export enum PriceType {
  NETTO = 1,
  BRUTTO = 2,
}

export type Price = {
  value: number;
  currency: string;
  type: PriceType;
};

export type Prices = { [key: string]: Price };
