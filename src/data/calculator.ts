import {
  ElementPricing,
  FencePanelFixedCostPricing,
  GateMotorPricing,
  MasonryParamsEntries,
  MasonryPricing,
} from '@/models/calculator.ts';
import { z } from 'zod';
import { validateNonNegativeInput, validatePrice } from '@/utils/validation.ts';

export const TYPES = {
  regular: {
    name: 'Zwykły',
  },
  masonry72: {
    name: 'Murowanie 72',
  },
  masonry83: {
    name: 'Murowanie 83',
  },
} as const;

export const PATTERNS = {
  pattern4: {
    name: 'Wzór 4',
  },
  aluminum: {
    name: 'Aluminium',
  },
  louver: {
    name: 'Żaluzja',
  },
  vertical: {
    name: 'Pionowe',
  },
} as const;

export const ELEMENT_TYPES = {
  swingGate: {
    name: 'Brama rozwierna',
  },
  slidingGate: {
    name: 'Brama przesuwna',
  },
  pedestrianGate: {
    name: 'Furtka',
  },
  fencePanel: {
    name: 'Przęsło',
  },
} as const;

export const GATE_MOTORS = {
  slidingGate: {
    name: 'Napęd do bramy przesuwnej',
  },
  swingGate: {
    name: 'Napęd do bramy rozwiernej',
  },
} as const;

export const ELEMENT_PRICING: ElementPricing = {
  pattern4: {
    swingGate: { pricePerM2: 850, fixedCost: 960 },
    slidingGate: { pricePerM2: 1120, fixedCost: 990 },
    pedestrianGate: { pricePerM2: 999, fixedCost: 680 },
    fencePanel: { pricePerM2: 640, fixedCost: 640 },
  },
  aluminum: {
    swingGate: { pricePerM2: 900, fixedCost: 960 },
    slidingGate: { pricePerM2: 1180, fixedCost: 990 },
    pedestrianGate: { pricePerM2: 1100, fixedCost: 680 },
    fencePanel: { pricePerM2: 699, fixedCost: 635 },
  },
  louver: {
    swingGate: { pricePerM2: 940, fixedCost: 960 },
    slidingGate: { pricePerM2: 1160, fixedCost: 990 },
    pedestrianGate: { pricePerM2: 1080, fixedCost: 680 },
    fencePanel: { pricePerM2: 699, fixedCost: 635 },
  },
  vertical: {
    swingGate: { pricePerM2: 1256, fixedCost: 960 },
    slidingGate: { pricePerM2: 1297, fixedCost: 990 },
    pedestrianGate: { pricePerM2: 1210, fixedCost: 680 },
    fencePanel: { pricePerM2: 820, fixedCost: 750 },
  },
} as const;

export const GATE_MOTOR_PRICING: GateMotorPricing = {
  slidingGate: 2700,
  swingGate: 3000,
} as const;

export const FENCE_PANEL_FIXED_COST: FencePanelFixedCostPricing = {
  regular: {
    panelWidth: 2.5,
    pricePerPanel: 250,
  },
  masonry72: {
    panelWidth: 2.5,
    pricePerPanel: 500,
  },
  masonry83: {
    panelWidth: 2.5,
    pricePerPanel: 500,
  },
} as const;

export const MASONRY_PRICING: MasonryPricing = {
  blockPrice: 50,
  foundationPrice: 345,
} as const;

export const MASONRY_PARAMS: MasonryParamsEntries = {
  masonry72: {
    blocksPerPost: 7,
    blocksPerSection: 10,
  },
  masonry83: {
    blocksPerPost: 8,
    blocksPerSection: 15,
  },
} as const;

export const elementSchema = z.object({
  width: validateNonNegativeInput('Szerokość'),
});

export const calculatorFormSchema = z.object({
  pattern: z.string().min(1, 'Wybierz wzór z listy'),
  type: z.string().min(1, 'Wybierz typ kalkulatora z listy'),
  targetHeight: validateNonNegativeInput('Wysokość'),
  elements: z.record(z.string(), elementSchema),
  gateMotors: z.record(z.string(), z.boolean()),
  fencePanelsLength: validateNonNegativeInput('Długość przęseł'),
});

export const elementPricingEntrySchema = z.object({
  pricePerM2: validatePrice(),
  fixedCost: validatePrice(),
});

export const gateMotorPricingSchema = z.object({
  slidingGate: validatePrice(),
  swingGate: validatePrice(),
});

export const fencePanelFixedCostPricingEntrySchema = z.object({
  panelWidth: validateNonNegativeInput('Długość przęsła'),
  pricePerPanel: validatePrice(),
});

export const masonryPricingSchema = z.object({
  blockPrice: validatePrice(),
  foundationPrice: validatePrice(),
});

export const masonryParamsEntrySchema = z.object({
  blocksPerPost: validateNonNegativeInput('Bloczki w słupkach'),
  blocksPerSection: validateNonNegativeInput('Bloczki pod przęsłami'),
});

export const editPricesFormSchema = z.object({
  elementPricing: z.record(
    z.string(), // Pattern
    z.record(
      z.string(), // Element type
      elementPricingEntrySchema,
    ),
  ),
  gateMotorPricing: gateMotorPricingSchema,
  fencePanelFixedCost: z.record(
    z.string(), // Calculator type
    fencePanelFixedCostPricingEntrySchema,
  ),
  masonryPricing: masonryPricingSchema,
  masonryParams: z.record(
    z.string(), // Calculator type
    masonryParamsEntrySchema,
  ),
});
