import { calculatorFormSchema, PATTERNS, TYPES } from '@/data/calculator.ts';
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
import { Input } from '@/components/ui/input.tsx';

interface HeaderProps {
  calculatorForm: UseFormReturn<z.input<typeof calculatorFormSchema>>;
}

export default function Header({ calculatorForm }: HeaderProps) {
  return (
    <div className='flex gap-2'>
      <div className='bg-blue-200 p-2'>
        <FormField
          control={calculatorForm.control}
          name='type'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Typ kalkulatora</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className='bg-white'>
                    <SelectValue placeholder='Wybierz kalkulator...' />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPES).map(([typeKey, type]) => (
                      <SelectItem key={typeKey} value={typeKey}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className='bg-blue-200 p-2'>
        <FormField
          control={calculatorForm.control}
          name='pattern'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Wzór</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className='bg-white'>
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
      </div>

      <div className='bg-blue-200 p-2'>
        <FormField
          control={calculatorForm.control}
          name='targetHeight'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Wysokość docelowa (cm)</FormLabel>
              <FormControl>
                <Input className='bg-white' type='number' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
