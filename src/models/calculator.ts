import {
  ELEMENT_TYPES,
  GATE_MOTORS,
  PATTERNS,
  TYPES,
} from '@/data/calculator.ts';

export type TypeKey = keyof typeof TYPES;
export type PatternKey = keyof typeof PATTERNS;
export type ElementTypeKey = keyof typeof ELEMENT_TYPES;
export type GateMotorKey = keyof typeof GATE_MOTORS;

export type ElementPricingEntry = {
  pricePerM2: number;
  fixedCost: number;
};

export type FencePanelFixedCostEntry = {
  panelWidth: number;
  pricePerPanel: number;
};

export type MasonryPricing = {
  blockPrice: number;
  foundationPrice: number;
};

export type MasonryParamsEntry = {
  blocksPerPost: number;
  blocksPerSection: number;
};

export type ElementPricing = {
  [P in PatternKey]: {
    [E in ElementTypeKey]: ElementPricingEntry;
  };
};

export type GateMotorPricing = {
  [G in GateMotorKey]: number;
};

export type FencePanelFixedCostPricing = {
  [T in TypeKey]: FencePanelFixedCostEntry;
};

export type MasonryParamsEntries = {
  [T in TypeKey]?: MasonryParamsEntry;
};

export type CalculatorOptions = {
  elementPricing: ElementPricing;
  gateMotorPricing: GateMotorPricing;
  fencePanelFixedCost: FencePanelFixedCostPricing;
  masonryPricing: MasonryPricing;
  masonryParams: MasonryParamsEntries;
};
