import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form.tsx';
import { Input } from '@/components/ui/input.tsx';
import { formatMoney } from '@/utils/money.ts';
import { Button } from '@/components/ui/button.tsx';
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import { validateNonNegativeInput } from '@/utils/validation.ts';
import { BUY_PRICE } from '@/data/comarch/prices.ts';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { OrderContext } from '@/models/order.ts';
import Combobox, { ComboboxItem } from '@/components/ui/combobox.tsx';
import { ComarchItemType, Item } from '@/api/comarch/item.ts';
import { Prices } from '@/models/comarch/prices.ts';
import { ItemType } from '@/models/bitrix/order.ts';
import { useGetTemplateItems } from '@/utils/item.ts';

interface AddTemplateItemDialogProps {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
  itemsData?: Array<Item> | null;
  addEditItem(editItem: Item, itemType?: ComarchItemType): Promise<Item>;
  selectItemManual(
    item: Item,
    type: ItemType,
    quantity: number,
    discount?: number,
  ): Promise<void>;
  setEditTemplateItemVisible: Dispatch<SetStateAction<boolean>>;
}

const formSchema = z.object({
  priceType: z
    .string()
    .min(1, 'Rodzaj ceny jest wymagany')
    .refine((val) => val !== BUY_PRICE, {
      message: 'Niedozwolony rodzaj ceny kontrahenta',
    }),
  code: z.string().min(1, 'Wybierz produkt z listy'),
  width: validateNonNegativeInput('Szerokość'),
  height: validateNonNegativeInput('Wysokość'),
  quantity: z
    .string()
    .min(1, 'Ilość jest wymagana')
    .refine((val) => !isNaN(parseFloat(val)), {
      message: 'Ilość musi być liczbą',
    })
    .refine((val) => parseFloat(val) > 0, {
      message: 'Ilość musi być większa od zera',
    }),
  color: z.string(),
  additional: z.string(),
});

export default function AddTemplateItemDialog({
  visible,
  setVisible,
  itemsData,
  addEditItem,
  selectItemManual,
  setEditTemplateItemVisible,
}: AddTemplateItemDialogProps) {
  const ctx = useContext(OrderContext);
  const currentTemplateItems = useGetTemplateItems();

  const itemsByCode = useMemo(
    () =>
      itemsData
        ? itemsData.reduce((acc: { [key: string]: Item }, current) => {
            acc[current.code] = current;
            return acc;
          }, {})
        : {},
    [itemsData],
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: useMemo(
      () => ({
        priceType: ctx?.selectedPrice,
        code: '',
        width: '0',
        height: '0',
        quantity: '1',
        color: '',
        additional: '',
      }),
      [ctx],
    ),
    mode: 'onChange',
  });

  const templateItems = useMemo(
    () => currentTemplateItems.map((code) => itemsByCode[code]),
    [itemsByCode, currentTemplateItems],
  )
    .filter(Boolean)
    .map(
      (item): ComboboxItem => ({
        label: item.name,
        value: item.code,
      }),
    );

  const formTemplateItem = form.watch();
  const formTemplateItemArea = useMemo(
    () => +formTemplateItem.width * +formTemplateItem.height,
    [formTemplateItem.width, formTemplateItem.height],
  );
  const currentTemplateItem = useMemo(
    () => itemsByCode[formTemplateItem.code],
    [itemsByCode, formTemplateItem.code],
  );
  const currentTemplateItemUnitPrice = useMemo(
    () =>
      ctx && currentTemplateItem
        ? currentTemplateItem.prices[ctx.selectedPrice!].value
        : 0,
    [ctx, currentTemplateItem],
  );
  const currentTemplateItemAreaPrice = useMemo(
    () => currentTemplateItemUnitPrice * formTemplateItemArea,
    [currentTemplateItemUnitPrice, formTemplateItemArea],
  );

  const onAddTemplateItemSubmit = useCallback(
    async (values: z.infer<typeof formSchema>) => {
      const area = +values.width * +values.height;
      const newPrices = Object.entries(currentTemplateItem.prices).reduce(
        (acc: Prices, [priceKey, price]) => {
          acc[priceKey] = { ...price, value: price.value * area };
          return acc;
        },
        {},
      );

      const sanitizedName = currentTemplateItem.name
        .replace('H=', '')
        .replace('L=', '')
        .replace(/\(\s*\)/g, '')
        .trim();

      const parts = [
        sanitizedName,
        values.color.trim(),
        values.additional.trim(),
        `(H=${values.height}m L=${values.width}m)`,
      ].filter(Boolean);

      const item = await addEditItem(
        {
          ...currentTemplateItem,
          unit: 'szt.',
          name: parts.join(' '),
          prices: newPrices,
          groups: ['ZAM1', 'MAG2', 'WYMIAR'],
        },
        ComarchItemType.GOOD,
      );

      await selectItemManual(
        item,
        ItemType.CUSTOM_TEMPLATE_ITEM,
        +values.quantity,
      );
      setVisible(false);
    },
    [currentTemplateItem, addEditItem, selectItemManual, setVisible],
  );

  useEffect(() => {
    form.reset({
      priceType: ctx?.selectedPrice,
      code: '',
      width: '0',
      height: '0',
      quantity: '1',
      color: '',
      additional: '',
    });

    void form.trigger('priceType');
  }, [ctx, form]);

  return (
    ctx && (
      <Dialog open={visible} onOpenChange={setVisible}>
        <DialogContent
          showCloseButton={false}
          className='lg:max-w-screen-lg overflow-y-auto max-h-screen'
        >
          <Form {...form}>
            <form
              className='flex flex-col gap-4'
              onSubmit={form.handleSubmit(onAddTemplateItemSubmit)}
            >
              <DialogHeader>
                <DialogTitle>
                  Dodaj pozycję z niestandardowym wymiarem
                </DialogTitle>
                <DialogDescription>Uzupełnij dane pozycji</DialogDescription>
              </DialogHeader>

              <div className='flex flex-col gap-4'>
                <FormField
                  control={form.control}
                  name='code'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pozycja</FormLabel>

                      <div className='flex items-center gap-4'>
                        <FormControl>
                          <Combobox
                            width={300}
                            items={templateItems}
                            {...field}
                          ></Combobox>
                        </FormControl>

                        <Button
                          type='button'
                          onClick={() => {
                            setEditTemplateItemVisible(true);
                            setVisible(false);
                          }}
                        >
                          Edytuj niestandardowe pozycje
                        </Button>
                      </div>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel>Nazwa</FormLabel>
                  <p>{currentTemplateItem?.name ?? 'brak'}</p>
                </FormItem>

                <FormItem>
                  <FormLabel>Jednostka</FormLabel>
                  <p>{currentTemplateItem?.unit ?? 'brak'}</p>
                </FormItem>

                <FormField
                  control={form.control}
                  name='color'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kolor</FormLabel>
                      <FormControl>
                        <Input type='text' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='additional'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dodatkowe parametry</FormLabel>
                      <FormControl>
                        <Input type='text' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='width'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Szerokość (m)</FormLabel>
                      <FormControl>
                        <Input type='number' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='height'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wysokość (m)</FormLabel>
                      <FormControl>
                        <Input type='number' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel>Powierzchnia (m²)</FormLabel>
                  <p>{formTemplateItemArea.toFixed(2)}</p>
                </FormItem>

                <FormField
                  control={form.control}
                  name='priceType'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rodzaj ceny</FormLabel>
                      <FormControl>
                        <Input disabled type='text' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel>
                    Cena jednostkowa - {ctx.selectedPrice} (zł)
                  </FormLabel>
                  <p>{formatMoney(currentTemplateItemUnitPrice)}</p>
                </FormItem>

                <FormItem>
                  <FormLabel>Cena za sztukę (zł)</FormLabel>
                  <p>{formatMoney(currentTemplateItemAreaPrice)}</p>
                </FormItem>

                <FormField
                  control={form.control}
                  name='quantity'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ilość</FormLabel>
                      <FormControl>
                        <Input type='number' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel>Wartość (zł)</FormLabel>
                  <p>
                    {formatMoney(
                      currentTemplateItemAreaPrice * +formTemplateItem.quantity,
                    )}
                  </p>
                </FormItem>
              </div>

              <DialogFooter>
                <Button
                  disabled={
                    !form.formState.isValid ||
                    !form.formState.isDirty ||
                    form.formState.isSubmitting
                  }
                  type='submit'
                  className='confirm'
                >
                  Dodaj
                </Button>
                <DialogClose asChild>
                  <Button className='delete'>Anuluj</Button>
                </DialogClose>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    )
  );
}
