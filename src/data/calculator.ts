import { ElementPricing, GateMotorPricing } from '@/models/calculator.ts';
import { z } from 'zod';
import { validateNonNegativeString } from '@/utils/validation.ts';

export const PATTERNS = {
  pattern_4: {
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
  swing_gate: {
    name: 'Brama rozwierna',
  },
  sliding_gate: {
    name: 'Brama przesuwna',
  },
  pedestrian_gate: {
    name: 'Furtka',
  },
  fence_panel: {
    name: 'Przęsło',
  },
} as const;

export const GATE_MOTORS = {
  sliding_gate: {
    name: 'Napęd do bramy przesuwnej',
  },
  swing_gate: {
    name: 'Napęd do bramy rozwiernej',
  },
} as const;

export const ELEMENT_PRICING: ElementPricing = {
  pattern_4: {
    swing_gate: { pricePerM2: 850, fixedCost: 960 },
    sliding_gate: { pricePerM2: 1120, fixedCost: 990 },
    pedestrian_gate: { pricePerM2: 999, fixedCost: 680 },
    fence_panel: { pricePerM2: 640, fixedCost: 640 },
  },
  aluminum: {
    swing_gate: { pricePerM2: 900, fixedCost: 960 },
    sliding_gate: { pricePerM2: 1180, fixedCost: 990 },
    pedestrian_gate: { pricePerM2: 1100, fixedCost: 680 },
    fence_panel: { pricePerM2: 699, fixedCost: 635 },
  },
  louver: {
    swing_gate: { pricePerM2: 940, fixedCost: 960 },
    sliding_gate: { pricePerM2: 1160, fixedCost: 990 },
    pedestrian_gate: { pricePerM2: 1080, fixedCost: 680 },
    fence_panel: { pricePerM2: 699, fixedCost: 635 },
  },
  vertical: {
    swing_gate: { pricePerM2: 1256, fixedCost: 960 },
    sliding_gate: { pricePerM2: 1297, fixedCost: 990 },
    pedestrian_gate: { pricePerM2: 1210, fixedCost: 680 },
    fence_panel: { pricePerM2: 820, fixedCost: 750 },
  },
} as const;

export const GATE_MOTOR_PRICING: GateMotorPricing = {
  sliding_gate: 2700,
  swing_gate: 3000,
};

export const FENCE_PANEL_FIXED_COST = {
  panelWidth: 2.5,
  pricePerPanel: 250,
} as const;

export const MASONRY_PRICING = {
  blockPrice: 50,
  foundationPrice: 345,
};

export const MASONRY_PARAMS = {
  blocksPerPost: 7,
  blocksPerSection: 10,
};

export const elementSchema = z.object({
  height: validateNonNegativeString('Wysokość'),
  width: validateNonNegativeString('Szerokość'),
});

export const calculatorFormSchema = z.object({
  pattern: z.string().min(1, 'Wybierz wzór z listy'),
  elements: z.record(z.string(), elementSchema),
  gateMotors: z.record(z.string(), z.boolean()),
  fencePanelsLength: validateNonNegativeString('Długość przęseł'),
});
