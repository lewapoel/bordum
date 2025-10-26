import {
  CalculatorOptions,
  ElementPricingEntry,
  ElementTypeKey,
  FencePanelFixedCostEntry,
  TypeKey,
} from '@/models/calculator.ts';
import { getAppOption, setAppOption } from '@/api/bitrix/appOption.ts';
import {
  ELEMENT_PRICING,
  FENCE_PANEL_FIXED_COST,
  GATE_MOTOR_PRICING,
  MASONRY_PARAMS,
  MASONRY_PRICING,
} from '@/data/calculator.ts';

export function getElementCost(
  area: number,
  elementPricing: ElementPricingEntry,
) {
  const pricePerM2 = elementPricing?.pricePerM2 ?? 0;
  const fixedCost = elementPricing?.fixedCost ?? 0;

  return area * pricePerM2 + fixedCost;
}

export function getFencePanelFixedCost(
  fixedCost: FencePanelFixedCostEntry,
  width: number,
) {
  return Math.round(width / fixedCost.panelWidth + 1) * fixedCost.pricePerPanel;
}

export function getElementHeight(
  elementKey: ElementTypeKey,
  type: TypeKey,
  targetHeight: number,
) {
  let heightDifference = 10;
  if (elementKey === 'fencePanel') {
    switch (type) {
      case 'masonry72':
        heightDifference += 45;
        break;

      case 'masonry83':
        heightDifference += 65;
        break;

      default:
        heightDifference += 20;
        break;
    }
  }

  return (targetHeight - heightDifference) / 100;
}

export function getOptions(): CalculatorOptions {
  const options = JSON.parse(getAppOption('CALCULATOR_OPTIONS') ?? '{}');

  return {
    gateMotorPricing: options.gateMotorPricing ?? GATE_MOTOR_PRICING,
    masonryParams: options.masonryParams ?? MASONRY_PARAMS,
    elementPricing: options.elementPricing ?? ELEMENT_PRICING,
    fencePanelFixedCost: options.fencePanelFixedCost ?? FENCE_PANEL_FIXED_COST,
    masonryPricing: options.masonryPricing ?? MASONRY_PRICING,
  };
}

export async function setOptions(options: any) {
  const toNumbers = (obj: any): any =>
    Array.isArray(obj)
      ? obj.map(toNumbers)
      : obj && typeof obj === 'object'
        ? Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [k, toNumbers(v)]),
          )
        : isNaN(obj)
          ? obj
          : +obj;

  return setAppOption('CALCULATOR_OPTIONS', JSON.stringify(toNumbers(options)));
}
