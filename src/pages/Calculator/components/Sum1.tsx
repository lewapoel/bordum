import { formatMoney } from '@/utils/money.ts';
import {
  calculatorFormSchema,
  ELEMENT_PRICING,
  GATE_MOTOR_PRICING,
} from '@/data/calculator.ts';
import {
  ElementTypeKey,
  GateMotorKey,
  PatternKey,
} from '@/models/calculator.ts';
import { z } from 'zod';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { Dispatch, SetStateAction, useEffect, useMemo } from 'react';
import { getElementCost, getFencePanelFixedCost } from '@/utils/calculator.ts';

interface Sum1Props {
  calculatorForm: UseFormReturn<z.input<typeof calculatorFormSchema>>;
  setMetalworkSum: Dispatch<SetStateAction<number>>;
}

export default function Sum1({ calculatorForm, setMetalworkSum }: Sum1Props) {
  const watchedCalculator = useWatch({ control: calculatorForm.control });
  const watchedPattern = watchedCalculator.pattern as PatternKey;

  const elementsCost = useMemo(
    () =>
      watchedCalculator.elements
        ? Object.entries(watchedCalculator.elements).reduce(
            (acc: number, [key, element]) => {
              const elementKey = key as ElementTypeKey;

              const height = +(element?.height || 0);
              const width = +(element?.width || 0);
              const area = width * height;

              const elementPricing =
                ELEMENT_PRICING[watchedPattern]?.[elementKey];
              acc += getElementCost(area, elementPricing);

              return acc;
            },
            0,
          )
        : 0,
    [watchedCalculator.elements, watchedPattern],
  );

  const gateMotorsCost = useMemo(
    () =>
      watchedCalculator.gateMotors
        ? Object.entries(watchedCalculator.gateMotors).reduce(
            (acc: number, [key, checked]) => {
              const gateMotorKey = key as GateMotorKey;

              acc += checked ? GATE_MOTOR_PRICING[gateMotorKey] : 0;
              return acc;
            },
            0,
          )
        : 0,
    [watchedCalculator.gateMotors],
  );

  const fencePanelFixedCost = useMemo(
    () =>
      getFencePanelFixedCost(
        +(watchedCalculator.elements?.fence_panel?.width || 0),
      ),
    [watchedCalculator.elements],
  );

  const metalworkSum = useMemo(
    () => elementsCost + fencePanelFixedCost,
    [elementsCost, fencePanelFixedCost],
  );

  const equipmentSum = useMemo(
    () => metalworkSum + gateMotorsCost,
    [metalworkSum, gateMotorsCost],
  );

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
