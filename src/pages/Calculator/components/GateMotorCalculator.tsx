import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form.tsx';
import { formatMoney } from '@/utils/money.ts';
import {
  calculatorFormSchema,
  GATE_MOTOR_PRICING,
  GATE_MOTORS,
} from '@/data/calculator.ts';
import { GateMotorKey } from '@/models/calculator.ts';
import { z } from 'zod';
import { UseFormReturn } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox.tsx';

interface GateMotorCalculatorProps {
  calculatorForm: UseFormReturn<z.input<typeof calculatorFormSchema>>;
}

export default function GateMotorCalculator({
  calculatorForm,
}: GateMotorCalculatorProps) {
  return (
    <table>
      <thead>
        <tr>
          <th></th>
          <th>Wybór</th>
          <th>Koszt napędu (zł)</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(GATE_MOTORS).map(([id, gateMotor]) => (
          <tr key={id}>
            <td>{gateMotor.name}</td>
            <td className='bg-red-200'>
              <FormField
                control={calculatorForm.control}
                name={`gateMotors.${id}`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Checkbox
                        className='mx-auto bg-white'
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </td>
            <td>{formatMoney(GATE_MOTOR_PRICING[id as GateMotorKey])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
