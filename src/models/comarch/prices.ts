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
