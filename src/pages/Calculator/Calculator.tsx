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
import Header from '@/pages/Calculator/components/Header.tsx';
import { Button } from '@/components/ui/button.tsx';
import MasonryCalculator from '@/pages/Calculator/components/MasonryCalculator.tsx';
import { formatMoney } from '@/utils/money.ts';
import { getCurrentPlacementId } from '@/utils/bitrix24.ts';
import { updateDealEstimate } from '@/api/bitrix/deal.ts';
import EditPrices from '@/pages/Calculator/components/EditPrices.tsx';
import { getCurrentUser, isCurrentUserAdmin } from '@/api/bitrix/user.ts';
import { ALLOWED_USERS } from '@/data/bitrix/user.ts';

export default function Calculator() {
  const placementId = getCurrentPlacementId();

  const calculatorForm = useForm({
    resolver: zodResolver(calculatorFormSchema),
    defaultValues: {
      type: 'regular',
      pattern: '',
      targetHeight: '0',
      elements: Object.keys(ELEMENT_TYPES).reduce(
        (acc: Record<string, z.input<typeof elementSchema>>, key) => {
          acc[key] = {
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

  const [editingAllowed, setEditingAllowed] = useState(false);
  const [editingPrices, setEditingPrices] = useState(false);
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

    getCurrentUser().then((currentUser) => {
      if (currentUser) {
        let isAdmin = false;
        isCurrentUserAdmin().then((res) => {
          isAdmin = res;
        });

        const canUse =
          ALLOWED_USERS.EDIT_CALCULATOR_PRICES.includes(currentUser.id) ||
          isAdmin;

        setEditingAllowed(canUse);
      }
    });
  }, [placementId]);

  return (
    <div className='mt-10'>
      <div className='w-full flex mb-4 justify-center'>
        <Button
          disabled={!editingAllowed}
          type='button'
          onClick={() => {
            if (editingAllowed) {
              setEditingPrices(!editingPrices);
            }
          }}
          className='h-full'
        >
          {editingPrices ? 'Wróć do kalkulatora' : 'Edytuj cennik'}
        </Button>
      </div>
      {editingPrices ? (
        <EditPrices />
      ) : (
        <Form {...calculatorForm}>
          <form
            className='flex flex-col gap-4 items-start'
            onSubmit={calculatorForm.handleSubmit(onCalculatorSubmit)}
          >
            <Header calculatorForm={calculatorForm} />
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
                calculatorForm.formState.isSubmitting
              }
              type='submit'
              className='confirm'
            >
              Zapisz
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
