import { useGetOptions, setOptions } from '@/utils/calculator.ts';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  editPricesFormSchema,
  ELEMENT_TYPES,
  elementPricingEntrySchema,
  fencePanelFixedCostPricingEntrySchema,
  GATE_MOTORS,
  MASONRY_PARAMS,
  masonryParamsEntrySchema,
  PATTERNS,
  TYPES,
} from '@/data/calculator.ts';
import { ElementTypeKey, PatternKey, TypeKey } from '@/models/calculator.ts';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useCallback, useMemo } from 'react';

export default function EditPrices() {
  const options = useGetOptions();

  const editPricesForm = useForm({
    resolver: zodResolver(editPricesFormSchema),
    defaultValues: useMemo(
      () => ({
        elementPricing: Object.keys(PATTERNS).reduce(
          (
            acc: Record<
              string,
              Record<string, z.input<typeof elementPricingEntrySchema>>
            >,
            patternKey,
          ) => {
            acc[patternKey] = Object.keys(ELEMENT_TYPES).reduce(
              (
                acc: Record<string, z.input<typeof elementPricingEntrySchema>>,
                elementTypeKey,
              ) => {
                const pricing =
                  options.elementPricing[patternKey as PatternKey][
                    elementTypeKey as ElementTypeKey
                  ];

                acc[elementTypeKey] = {
                  fixedCost: pricing.fixedCost.toString(),
                  pricePerM2: pricing.pricePerM2.toString(),
                };
                return acc;
              },
              {},
            );

            return acc;
          },
          {},
        ),
        gateMotorPricing: {
          slidingGate: options.gateMotorPricing.slidingGate.toString(),
          swingGate: options.gateMotorPricing.swingGate.toString(),
        },
        fencePanelFixedCost: Object.keys(TYPES).reduce(
          (
            acc: Record<
              string,
              z.input<typeof fencePanelFixedCostPricingEntrySchema>
            >,
            typeKey,
          ) => {
            const pricing = options.fencePanelFixedCost[typeKey as TypeKey];

            acc[typeKey] = {
              panelWidth: pricing.panelWidth.toString(),
              pricePerPanel: pricing.pricePerPanel.toString(),
            };
            return acc;
          },
          {},
        ),
        masonryPricing: {
          blockPrice: options.masonryPricing.blockPrice.toString(),
          foundationPrice: options.masonryPricing.foundationPrice.toString(),
        },
        masonryParams: Object.keys(TYPES).reduce(
          (
            acc: Record<string, z.input<typeof masonryParamsEntrySchema>>,
            typeKey,
          ) => {
            const entry = options.masonryParams[typeKey as TypeKey];

            if (entry) {
              acc[typeKey] = {
                blocksPerPost: entry.blocksPerPost.toString(),
                blocksPerSection: entry.blocksPerSection.toString(),
              };
            }
            return acc;
          },
          {},
        ),
      }),
      [options],
    ),
    mode: 'onChange',
  });

  const onEditPricesSubmit = useCallback(
    async (values: z.infer<typeof editPricesFormSchema>) => {
      const result = await setOptions(values);

      if (result) {
        alert('Zapisano cennik pomyślnie');
      }
    },
    [],
  );

  return (
    <Form {...editPricesForm}>
      <form
        className='flex flex-col gap-4 items-start'
        onSubmit={editPricesForm.handleSubmit(onEditPricesSubmit)}
      >
        <h2 className='font-bold'>Cennik elementów</h2>
        <table>
          <thead>
            <tr>
              <th>Wzór</th>
              <th>Typ elementu</th>
              <th>Cena za m²</th>
              <th>Koszt stały</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(PATTERNS).map(([patternKey, pattern]) =>
              Object.entries(ELEMENT_TYPES).map(
                ([elementTypeKey, elementType]) => (
                  <tr key={`${patternKey}-${elementTypeKey}`}>
                    <td>{pattern.name}</td>
                    <td>{elementType.name}</td>
                    <td className='bg-blue-200'>
                      <FormField
                        control={editPricesForm.control}
                        name={`elementPricing.${patternKey}.${elementTypeKey}.pricePerM2`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <input
                                type='number'
                                className='w-[150px]'
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </td>
                    <td className='bg-blue-200'>
                      <FormField
                        control={editPricesForm.control}
                        name={`elementPricing.${patternKey}.${elementTypeKey}.fixedCost`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <input
                                type='number'
                                className='w-[150px]'
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </td>
                  </tr>
                ),
              ),
            )}
          </tbody>
        </table>

        <h2 className='font-bold'>Cennik napędów do bramy</h2>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Cena</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(GATE_MOTORS).map(([gateMotorKey, gateMotor]) => (
              <tr key={gateMotorKey}>
                <td>{gateMotor.name}</td>
                <td className='bg-blue-200'>
                  <FormField
                    control={editPricesForm.control}
                    // @ts-ignore
                    name={`gateMotorPricing.${gateMotorKey}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          {/*
                          // @ts-ignore */}
                          <input
                            type='number'
                            className='w-[150px]'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className='font-bold'>Dodatkowy koszt stały przęsła</h2>
        <table>
          <thead>
            <tr>
              <th>Typ kalkulatora</th>
              <th>Dzielnik długości (m)</th>
              <th>Cena za sztukę</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(TYPES).map(([typeKey, calculatorType]) => (
              <tr key={typeKey}>
                <td>{calculatorType.name}</td>
                <td className='bg-blue-200'>
                  <FormField
                    control={editPricesForm.control}
                    name={`fencePanelFixedCost.${typeKey}.panelWidth`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <input
                            type='number'
                            className='w-[150px]'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </td>
                <td className='bg-blue-200'>
                  <FormField
                    control={editPricesForm.control}
                    name={`fencePanelFixedCost.${typeKey}.pricePerPanel`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <input
                            type='number'
                            className='w-[150px]'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className='font-bold'>Cennik murowania</h2>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Cena</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cena bloczka</td>
              <td className='bg-blue-200'>
                <FormField
                  control={editPricesForm.control}
                  name='masonryPricing.blockPrice'
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
            </tr>
            <tr>
              <td>Cena fundamentu</td>
              <td className='bg-blue-200'>
                <FormField
                  control={editPricesForm.control}
                  name='masonryPricing.foundationPrice'
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
            </tr>
          </tbody>
        </table>

        <h2 className='font-bold'>Parametry murowania</h2>
        <table>
          <thead>
            <tr>
              <th>Typ kalkulatora</th>
              <th>Bloczki w słupkach</th>
              <th>Bloczki pod przęsłami</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(TYPES)
              .filter(([typeKey]) =>
                Object.keys(MASONRY_PARAMS).includes(typeKey),
              )
              .map(([typeKey, calculatorType]) => (
                <tr key={typeKey}>
                  <td>{calculatorType.name}</td>
                  <td className='bg-blue-200'>
                    <FormField
                      control={editPricesForm.control}
                      name={`masonryParams.${typeKey}.blocksPerPost`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <input
                              type='number'
                              className='w-[150px]'
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </td>
                  <td className='bg-blue-200'>
                    <FormField
                      control={editPricesForm.control}
                      name={`masonryParams.${typeKey}.blocksPerSection`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <input
                              type='number'
                              className='w-[150px]'
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        <Button
          disabled={
            !editPricesForm.formState.isValid ||
            editPricesForm.formState.isSubmitting
          }
          type='submit'
          className='confirm mx-auto'
        >
          Zapisz
        </Button>
      </form>
    </Form>
  );
}
