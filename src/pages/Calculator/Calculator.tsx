import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Form } from '@/components/ui/form.tsx';
import {
  calculatorFormSchema,
  ELEMENT_TYPES,
  elementSchema,
  GATE_MOTORS,
} from '@/data/calculator.ts';
import ElementCalculator from '@/pages/Calculator/components/ElementCalculator.tsx';
import GateMotorCalculator from '@/pages/Calculator/components/GateMotorCalculator.tsx';
import Sum1 from '@/pages/Calculator/components/Sum1.tsx';
import Pattern from '@/pages/Calculator/components/Pattern.tsx';
import { Button } from '@/components/ui/button.tsx';
import MasonryCalculator from '@/pages/Calculator/components/MasonryCalculator.tsx';
import { formatMoney } from '@/utils/money.ts';
import { getCurrentPlacementId } from '@/utils/bitrix24.ts';
import { updateDealEstimate } from '@/api/bitrix/deal.ts';

export default function Calculator() {
  const placementId = getCurrentPlacementId();

  const calculatorForm = useForm({
    resolver: zodResolver(calculatorFormSchema),
    defaultValues: {
      pattern: '',
      elements: Object.keys(ELEMENT_TYPES).reduce(
        (acc: Record<string, z.input<typeof elementSchema>>, key) => {
          acc[key] = {
            height: '0',
            width: '0',
          };

          return acc;
        },
        {},
      ),
      gateMotors: Object.keys(GATE_MOTORS).reduce(
        (acc: Record<string, boolean>, key) => {
          acc[key] = false;
          return acc;
        },
        {},
      ),
      fencePanelsLength: '0',
    },
    mode: 'onChange',
  });

  const [metalworkSum, setMetalworkSum] = useState(0);
  const [masonrySum, setMasonrySum] = useState(0);

  const totalSum = useMemo(
    () => metalworkSum + masonrySum,
    [metalworkSum, masonrySum],
  );

  const onCalculatorSubmit = useCallback(async () => {
    void updateDealEstimate(placementId, totalSum);
  }, [totalSum, placementId]);

  useEffect(() => {
    if (!placementId) {
      alert('Nie można pobrać ID aktualnego deala');
      return;
    }
  }, [placementId]);

  return (
    <div className='mt-10'>
      <Form {...calculatorForm}>
        <form
          className='flex flex-col gap-4 items-start'
          onSubmit={calculatorForm.handleSubmit(onCalculatorSubmit)}
        >
          <Pattern calculatorForm={calculatorForm} />
          <GateMotorCalculator calculatorForm={calculatorForm} />
          <ElementCalculator calculatorForm={calculatorForm} />
          <Sum1
            calculatorForm={calculatorForm}
            setMetalworkSum={setMetalworkSum}
          />
          <MasonryCalculator
            calculatorForm={calculatorForm}
            setMasonrySum={setMasonrySum}
          />

          <table>
            <tbody>
              <tr>
                <th>Suma całkowita</th>
                <td>{formatMoney(totalSum)}</td>
              </tr>
            </tbody>
          </table>

          <Button
            disabled={
              !calculatorForm.formState.isValid ||
              !calculatorForm.formState.isDirty ||
              calculatorForm.formState.isSubmitting
            }
            type='submit'
            className='confirm'
          >
            Zapisz
          </Button>
        </form>
      </Form>
    </div>
  );
}
