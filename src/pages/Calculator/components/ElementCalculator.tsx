import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form.tsx';
import { formatMoney } from '@/utils/money.ts';
import { calculatorFormSchema, ELEMENT_TYPES } from '@/data/calculator.ts';
import { ElementTypeKey, PatternKey, TypeKey } from '@/models/calculator.ts';
import { z } from 'zod';
import { UseFormReturn, useWatch } from 'react-hook-form';
import {
  getElementCost,
  getElementHeight,
  getFencePanelFixedCost,
  useGetOptions,
} from '@/utils/calculator.ts';
import { useEffect } from 'react';

interface ElementCalculatorProps {
  calculatorForm: UseFormReturn<z.input<typeof calculatorFormSchema>>;
}

export default function ElementCalculator({
  calculatorForm,
}: ElementCalculatorProps) {
  const options = useGetOptions();
  const watchedCalculator = useWatch({ control: calculatorForm.control });

  const watchedType = watchedCalculator?.type as TypeKey;
  const watchedFencePanelWidth = +(
    watchedCalculator.elements?.fencePanel?.width || 0
  );
  const watchedFencePanelLength = +(watchedCalculator.fencePanelsLength ?? '0');
  const fencePanelFixedCostEntry = options.fencePanelFixedCost[watchedType];
  const fencePanelFixedCost = getFencePanelFixedCost(
    fencePanelFixedCostEntry,
    watchedFencePanelWidth,
  );

  useEffect(() => {
    if (watchedType !== 'regular') {
      const sectionCount = Math.round(watchedFencePanelLength / 2.5);
      calculatorForm.setValue(
        'elements.fencePanel.width',
        (watchedFencePanelLength - sectionCount * 0.5).toString(),
      );
    }
  }, [watchedType, calculatorForm, watchedFencePanelLength]);

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

          const targetHeight = +(watchedCalculator.targetHeight || 0);
          const height = getElementHeight(
            elementKey,
            watchedType,
            targetHeight,
          );
          const width = +(watchedElement?.width || 0);
          const area = width * height;

          const elementPricing =
            options.elementPricing[watchedPattern]?.[elementKey];
          const pricePerM2 = elementPricing?.pricePerM2 ?? 0;
          const fixedCost = elementPricing?.fixedCost ?? 0;

          const elementCost = getElementCost(area, elementPricing);

          const canEdit =
            watchedCalculator?.type === 'regular' ||
            elementKey !== 'fencePanel';

          return (
            <tr key={key}>
              <td>{elementType.name}</td>
              <td>{height.toFixed(2)}</td>
              <td className={canEdit ? 'bg-blue-200' : ''}>
                <FormField
                  disabled={!canEdit}
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
              <td>{area.toFixed(3)}</td>
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
          <td>{`${formatMoney(fencePanelFixedCostEntry.pricePerPanel)}/szt. co ${fencePanelFixedCostEntry.panelWidth} m`}</td>
          <td>{formatMoney(fencePanelFixedCost)}</td>
        </tr>
      </tbody>
    </table>
  );
}
