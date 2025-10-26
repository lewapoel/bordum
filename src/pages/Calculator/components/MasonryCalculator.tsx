import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form.tsx';
import { formatMoney } from '@/utils/money.ts';
import { calculatorFormSchema } from '@/data/calculator.ts';
import { z } from 'zod';
import { UseFormReturn } from 'react-hook-form';
import { Dispatch, SetStateAction, useEffect } from 'react';
import { TypeKey } from '@/models/calculator.ts';
import { getOptions } from '@/utils/calculator.ts';

interface MasonryCalculatorProps {
  calculatorForm: UseFormReturn<z.input<typeof calculatorFormSchema>>;
  setMasonrySum: Dispatch<SetStateAction<number>>;
}

export default function MasonryCalculator({
  calculatorForm,
  setMasonrySum,
}: MasonryCalculatorProps) {
  const options = getOptions();

  const watchedCalculator = calculatorForm.watch();
  const watchedType = watchedCalculator.type as TypeKey;
  const masonryParams = options.masonryParams[watchedType];

  const fencePanelsLength = +watchedCalculator.fencePanelsLength || 0;
  const sectionCount = Math.round(fencePanelsLength / 2.5);
  const postCount = sectionCount + 1;
  const blocksInPost = postCount * (masonryParams?.blocksPerPost ?? 0);
  const blocksUnderSection =
    sectionCount * (masonryParams?.blocksPerSection ?? 0);
  const totalBlocks = blocksInPost + blocksUnderSection;
  const blocksCost = totalBlocks * options.masonryPricing.blockPrice;
  const foundationCost =
    fencePanelsLength * options.masonryPricing.foundationPrice;
  const masonryCost = blocksCost + foundationCost;

  const enabled = watchedType in options.masonryParams;

  useEffect(() => {
    if (enabled) {
      setMasonrySum(masonryCost);
    } else {
      setMasonrySum(0);
    }
  }, [masonryCost, setMasonrySum, enabled]);

  return (
    <>
      {enabled && (
        <table className='hollow'>
          <thead>
            <tr>
              <th colSpan={2}>Sekcja: Murowanie (bloczków + fundament)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>Długość przęseł (m)</th>
              <td className='bg-blue-200'>
                <FormField
                  control={calculatorForm.control}
                  name='fencePanelsLength'
                  render={({ field }) => (
                    <FormItem className='items-center flex flex-col'>
                      <FormControl>
                        <input
                          type='number'
                          className='w-[150px] text-center'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </td>
            </tr>
            <tr>
              <th>Cena bloczka (zł/szt.)</th>
              <td>{formatMoney(options.masonryPricing.blockPrice)}</td>
            </tr>
            <tr>
              <th>Cena fundamentu (zł/m)</th>
              <td>{formatMoney(options.masonryPricing.foundationPrice)}</td>
            </tr>
            <tr className='empty'>
              <th className='empty'></th>
              <td className='empty'></td>
            </tr>
            <tr>
              <th>Ilość odcinków (przęsła)</th>
              <td>{sectionCount}</td>
            </tr>
            <tr>
              <th>Ilość słupków</th>
              <td>{postCount}</td>
            </tr>
            <tr>
              <th>
                Bloczki w słupkach ({masonryParams?.blocksPerPost} szt/słupek)
              </th>
              <td>{blocksInPost}</td>
            </tr>
            <tr>
              <th>
                Bloczki pod przęsłami ({masonryParams?.blocksPerSection}{' '}
                szt/odcinek)
              </th>
              <td>{blocksUnderSection}</td>
            </tr>
            <tr>
              <th>Razem bloczków</th>
              <td>{totalBlocks}</td>
            </tr>
            <tr>
              <th>Koszt bloczków (zł)</th>
              <td>{formatMoney(blocksCost)}</td>
            </tr>
            <tr>
              <th>Koszt fundamentu (zł)</th>
              <td>{formatMoney(foundationCost)}</td>
            </tr>
            <tr>
              <th>Suma murowania (zł)</th>
              <td>{formatMoney(masonryCost)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </>
  );
}
