import { formatMoney } from '@/utils/money.ts';
import { calculatorFormSchema } from '@/data/calculator.ts';
import {
  ElementTypeKey,
  GateMotorKey,
  PatternKey,
  TypeKey,
} from '@/models/calculator.ts';
import { z } from 'zod';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { Dispatch, SetStateAction, useEffect, useMemo } from 'react';
import {
  getElementCost,
  getElementHeight,
  getFencePanelFixedCost,
  getOptions,
} from '@/utils/calculator.ts';

interface Sum1Props {
  calculatorForm: UseFormReturn<z.input<typeof calculatorFormSchema>>;
  setMetalworkSum: Dispatch<SetStateAction<number>>;
}

export default function Sum1({ calculatorForm, setMetalworkSum }: Sum1Props) {
  const options = getOptions();
  const watchedCalculator = useWatch({ control: calculatorForm.control });

  const watchedType = watchedCalculator.type as TypeKey;
  const watchedPattern = watchedCalculator.pattern as PatternKey;
  const watchedFencePanelsLength = +(
    watchedCalculator.fencePanelsLength ?? '0'
  );
  const watchedFencePanelWidth = +(
    watchedCalculator.elements?.fencePanel?.width ?? '0'
  );

  const fencePanelFixedCostEntry = options.fencePanelFixedCost[watchedType];

  const elementsCost = useMemo(
    () =>
      watchedCalculator.elements
        ? Object.entries(watchedCalculator.elements).reduce(
            (acc: number, [key, element]) => {
              const elementKey = key as ElementTypeKey;

              const targetHeight = +(watchedCalculator.targetHeight || 0);
              const height = getElementHeight(
                elementKey,
                watchedType,
                targetHeight,
              );
              const width = +(element?.width || 0);
              const area = width * height;

              const elementPricing =
                options.elementPricing[watchedPattern]?.[elementKey];
              acc += getElementCost(area, elementPricing);

              return acc;
            },
            0,
          )
        : 0,
    [
      watchedCalculator.elements,
      watchedPattern,
      watchedCalculator.targetHeight,
      watchedType,
      options.elementPricing,
    ],
  );

  const gateMotorsCost = useMemo(
    () =>
      watchedCalculator.gateMotors
        ? Object.entries(watchedCalculator.gateMotors).reduce(
            (acc: number, [key, checked]) => {
              const gateMotorKey = key as GateMotorKey;

              acc += checked ? options.gateMotorPricing[gateMotorKey] : 0;
              return acc;
            },
            0,
          )
        : 0,
    [watchedCalculator.gateMotors, options.gateMotorPricing],
  );

  const fencePanelFixedCost = useMemo(
    () =>
      getFencePanelFixedCost(
        fencePanelFixedCostEntry,
        watchedType === 'regular'
          ? watchedFencePanelWidth
          : watchedFencePanelsLength,
      ),
    [
      watchedFencePanelWidth,
      fencePanelFixedCostEntry,
      watchedFencePanelsLength,
      watchedType,
    ],
  );

  const metalworkSum = useMemo(
    () => elementsCost + fencePanelFixedCost + gateMotorsCost,
    [elementsCost, fencePanelFixedCost, gateMotorsCost],
  );

  const equipmentSum = useMemo(() => metalworkSum, [metalworkSum]);

  useEffect(() => {
    setMetalworkSum(metalworkSum);
  }, [metalworkSum, setMetalworkSum]);

  return (
    <table>
      <tbody>
        <tr>
          <th>Suma całkowita</th>
          <td>{formatMoney(equipmentSum)}</td>
        </tr>
        <tr>
          <th>Suma metaloplastyki</th>
          <td>{formatMoney(metalworkSum)}</td>
        </tr>
      </tbody>
    </table>
  );
}
