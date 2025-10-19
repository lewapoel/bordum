import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form.tsx';
import { formatMoney } from '@/utils/money.ts';
import {
  calculatorFormSchema,
  MASONRY_PARAMS,
  MASONRY_PRICING,
} from '@/data/calculator.ts';
import { z } from 'zod';
import { UseFormReturn } from 'react-hook-form';
import { Dispatch, SetStateAction, useEffect } from 'react';

interface MasonryCalculatorProps {
  calculatorForm: UseFormReturn<z.input<typeof calculatorFormSchema>>;
  setMasonrySum: Dispatch<SetStateAction<number>>;
}

export default function MasonryCalculator({
  calculatorForm,
  setMasonrySum,
}: MasonryCalculatorProps) {
  const watchedCalculator = calculatorForm.watch();
  const fencePanelsLength = +watchedCalculator.fencePanelsLength || 0;
  const sectionCount = Math.round(fencePanelsLength / 2.5);
  const postCount = sectionCount + 1;
  const blocksInPost = postCount * MASONRY_PARAMS.blocksPerPost;
  const blocksUnderSection = sectionCount * MASONRY_PARAMS.blocksPerSection;
  const totalBlocks = blocksInPost + blocksUnderSection;
  const blocksCost = totalBlocks * MASONRY_PRICING.blockPrice;
  const foundationCost = fencePanelsLength * MASONRY_PRICING.foundationPrice;
  const masonryCost = blocksCost + foundationCost;

  useEffect(() => {
    setMasonrySum(masonryCost);
  }, [masonryCost, setMasonrySum]);

  return (
    <table className='hollow'>
      <thead>
        <tr>
          <th colSpan={2}>Sekcja: Murowanie (bloczków + fundament)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th>Długość przęseł (m)</th>
          <td>
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
          <td>{formatMoney(MASONRY_PRICING.blockPrice)}</td>
        </tr>
        <tr>
          <th>Cena fundamentu (zł/m)</th>
          <td>{formatMoney(MASONRY_PRICING.foundationPrice)}</td>
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
          <th>Bloczki w słupkach (7 szt/słupek)</th>
          <td>{blocksInPost}</td>
        </tr>
        <tr>
          <th>Bloczki pod przęsłami (10 szt/odcinek)</th>
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
  );
}
