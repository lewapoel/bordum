import { ElementPricingEntry } from '@/models/calculator.ts';
import { FENCE_PANEL_FIXED_COST } from '@/data/calculator.ts';

export function getElementCost(
  area: number,
  elementPricing: ElementPricingEntry,
) {
  const pricePerM2 = elementPricing?.pricePerM2 ?? 0;
  const fixedCost = elementPricing?.fixedCost ?? 0;

  return area * pricePerM2 + fixedCost;
}

export function getFencePanelFixedCost(width: number) {
  return (
    Math.round(width / FENCE_PANEL_FIXED_COST.panelWidth + 1) *
    FENCE_PANEL_FIXED_COST.pricePerPanel
  );
}
