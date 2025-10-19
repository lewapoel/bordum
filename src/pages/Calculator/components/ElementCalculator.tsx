import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form.tsx';
import { formatMoney } from '@/utils/money.ts';
import {
  calculatorFormSchema,
  ELEMENT_PRICING,
  ELEMENT_TYPES,
  FENCE_PANEL_FIXED_COST,
} from '@/data/calculator.ts';
import { ElementTypeKey, PatternKey } from '@/models/calculator.ts';
import { z } from 'zod';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { getElementCost, getFencePanelFixedCost } from '@/utils/calculator.ts';

interface ElementCalculatorProps {
  calculatorForm: UseFormReturn<z.input<typeof calculatorFormSchema>>;
}

export default function ElementCalculator({
  calculatorForm,
}: ElementCalculatorProps) {
  const watchedCalculator = useWatch({ control: calculatorForm.control });

  const watchedFencePanelWidth = +(
    watchedCalculator.elements?.fence_panel?.width || 0
  );
  const fencePanelFixedCost = getFencePanelFixedCost(watchedFencePanelWidth);

  return (
    <table className='hollow'>
      <thead>
        <tr>
          <th>Typ elementu</th>
          <th>Wysokość (m)</th>
          <th>Szerokość (m)</th>
          <th>Powierzchnia (m²)</th>
          <th>Cena za m²</th>
          <th>Koszt stały</th>
          <th>Koszt elementu</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(ELEMENT_TYPES).map(([key, elementType]) => {
          const elementKey = key as ElementTypeKey;
          const watchedPattern = watchedCalculator.pattern as PatternKey;
          const watchedElement = watchedCalculator?.elements?.[key];

          const height = +(watchedElement?.height || 0);
          const width = +(watchedElement?.width || 0);
          const area = width * height;

          const elementPricing = ELEMENT_PRICING[watchedPattern]?.[elementKey];
          const pricePerM2 = elementPricing?.pricePerM2 ?? 0;
          const fixedCost = elementPricing?.fixedCost ?? 0;

          const elementCost = getElementCost(area, elementPricing);

          return (
            <tr key={key}>
              <td>{elementType.name}</td>
              <td className='bg-red-200'>
                <FormField
                  control={calculatorForm.control}
                  name={`elements.${key}.height`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <input type='number' className='w-[150px]' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </td>
              <td className='bg-red-200'>
                <FormField
                  control={calculatorForm.control}
                  name={`elements.${key}.width`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <input type='number' className='w-[150px]' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </td>
              <td>{area.toFixed(2)}</td>
              <td>{formatMoney(pricePerM2)}</td>
              <td>{formatMoney(fixedCost)}</td>
              <td>{formatMoney(elementCost)}</td>
            </tr>
          );
        })}
        <tr>
          <td className='empty'></td>
          <td className='empty'></td>
          <td className='empty'></td>
          <td className='empty'></td>
          <td className='empty'></td>
          <td>{`${formatMoney(FENCE_PANEL_FIXED_COST.pricePerPanel)}/szt. co ${FENCE_PANEL_FIXED_COST.panelWidth} m`}</td>
          <td>{formatMoney(fencePanelFixedCost)}</td>
        </tr>
      </tbody>
    </table>
  );
}
