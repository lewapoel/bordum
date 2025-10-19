import { ELEMENT_TYPES, GATE_MOTORS, PATTERNS } from '@/data/calculator.ts';

export type PatternKey = keyof typeof PATTERNS;
export type ElementTypeKey = keyof typeof ELEMENT_TYPES;
export type GateMotorKey = keyof typeof GATE_MOTORS;

export type ElementPricingEntry = {
  pricePerM2: number;
  fixedCost: number;
};

export type ElementPricing = {
  [P in PatternKey]: {
    [E in ElementTypeKey]: ElementPricingEntry;
  };
};

export type GateMotorPricing = {
  [G in GateMotorKey]: number;
};
