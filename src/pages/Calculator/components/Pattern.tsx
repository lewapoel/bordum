import { calculatorFormSchema, PATTERNS } from '@/data/calculator.ts';
import { z } from 'zod';
import { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';

interface PatternProps {
  calculatorForm: UseFormReturn<z.input<typeof calculatorFormSchema>>;
}

export default function Pattern({ calculatorForm }: PatternProps) {
  return (
    <FormField
      control={calculatorForm.control}
      name='pattern'
      render={({ field }) => (
        <FormItem>
          <FormLabel>Wzór</FormLabel>
          <FormControl>
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder='Wybierz wzór...' />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PATTERNS).map(([patternKey, pattern]) => (
                  <SelectItem key={patternKey} value={patternKey}>
                    {pattern.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
