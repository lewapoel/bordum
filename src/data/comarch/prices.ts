export const PRICES = [
  'detaliczna',
  'hurtowa 1',
  'hurtowa 2',
  'hurtowa 3',
  'zakupu',
] as const;

export const DEFAULT_PRICE = PRICES[0];

export enum PriceType {
  NETTO,
  BRUTTO,
}

// Types of prices returned by the API
export const PRICES_TYPE_MAP: Record<string, PriceType> = {
  zakupu: PriceType.NETTO,
  'hurtowa 1': PriceType.NETTO,
  'hurtowa 2': PriceType.NETTO,
  'hurtowa 3': PriceType.NETTO,
  detaliczna: PriceType.BRUTTO,
};
