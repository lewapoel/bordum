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
import { toast } from 'react-toastify';
import { Input } from '@/components/ui/input.tsx';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dispatch, SetStateAction, useCallback, useContext } from 'react';
import { validatePrice } from '@/utils/validation.ts';
import { OrderContext } from '@/models/order.ts';
import { AuthContext } from '@/components/AuthContext.tsx';
import { useAddItem } from '@/api/comarch/item.ts';
import { TEMPORARY_ITEM_GROUP } from '@/data/comarch/groups.ts';
import { PriceType } from '@/models/comarch/prices.ts';
import { ItemType } from '@/models/bitrix/order.ts';
import { Button } from '@/components/ui/button.tsx';
import { generateRandomCode } from '@/utils/hash.ts';

const formSchema = z.object({
  name: z.string().min(1, 'Nazwa pozycji jest wymagana'),
  unit: z.string().min(1, 'Jednostka pozycji jest wymagana'),
  prices: z.object({
    retail: validatePrice(),
  }),
  quantity: z
    .string()
    .min(1, 'Ilość jest wymagana')
    .refine((val) => !isNaN(parseFloat(val)), {
      message: 'Ilość musi być liczbą',
    })
    .refine((val) => parseFloat(val) > 0, {
      message: 'Ilość musi być większa od zera',
    }),
});

interface AddItemDialogProps {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
}

export default function AddItemDialog({
  visible,
  setVisible,
}: AddItemDialogProps) {
  const { token, sqlToken } = useContext(AuthContext);
  const ctx = useContext(OrderContext);

  const addItemMutation = useAddItem(token, sqlToken);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      unit: 'szt.',
      prices: {
        retail: '0',
      },
      quantity: '1',
    },
    mode: 'onChange',
  });

  const onSubmit = useCallback(
    async (values: z.infer<typeof formSchema>) => {
      if (ctx) {
        await toast.promise(
          async () => {
            const newItem = await addItemMutation.mutateAsync({
              id: 0,
              unit: values.unit,
              name: values.name,
              groups: [TEMPORARY_ITEM_GROUP],
              code: generateRandomCode(),
              vatRate: 23.0,
              prices: {
                zakupu: {
                  number: 1,
                  type: PriceType.NETTO,
                  value: 0,
                  currency: 'PLN',
                },
                'hurtowa 1': {
                  number: 2,
                  type: PriceType.NETTO,
                  value: 0,
                  currency: 'PLN',
                },
                'hurtowa 2': {
                  number: 3,
                  type: PriceType.NETTO,
                  value: 0,
                  currency: 'PLN',
                },
                'hurtowa 3': {
                  number: 4,
                  type: PriceType.NETTO,
                  value: 0,
                  currency: 'PLN',
                },
                detaliczna: {
                  number: 5,
                  type: PriceType.BRUTTO,
                  value: +values.prices.retail,
                  currency: 'PLN',
                },
              },
            });

            if (newItem) {
              ctx.saveItem({
                code: newItem.code,
                groups: newItem.groups,
                itemId: newItem.id.toString(),
                productName: newItem.name,
                type: ItemType.CUSTOM_ITEM,
                quantity: +values.quantity,
                unit: newItem.unit,
                unitPrice: newItem.prices['detaliczna'].value,
                discountRate: 0,
                taxRate: newItem.vatRate,
              });

              toast.info(`Dodano nową pozycję: ${newItem.name}`, {
                position: 'top-center',
                theme: 'light',
                autoClose: 2000,
              });

              setVisible(false);
            }
          },
          {
            pending: 'Dodawanie nowej pozycji...',
          },
          {
            position: 'top-center',
            theme: 'light',
          },
        );
      }
    },
    [ctx, addItemMutation, setVisible],
  );

  return (
    <Dialog open={visible} onOpenChange={setVisible}>
      <DialogContent
        showCloseButton={false}
        className='lg:max-w-screen-lg overflow-y-auto max-h-screen'
      >
        <Form {...form}>
          <form
            className='flex flex-col gap-4'
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <DialogHeader>
              <DialogTitle>Dodaj niestandardową pozycję</DialogTitle>
              <DialogDescription>Uzupełnij dane pozycji</DialogDescription>
            </DialogHeader>

            <div className='flex flex-col gap-4'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nazwa</FormLabel>
                    <FormControl>
                      <Input
                        type='text'
                        placeholder='Wprowadź nazwę pozycji...'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='unit'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jednostka</FormLabel>
                    <FormControl>
                      <Input
                        type='text'
                        placeholder='Wprowadź nazwę jednostki...'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='prices.retail'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cena detaliczna (brutto)</FormLabel>
                    <FormControl>
                      <Input type='number' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                Zapisz
              </Button>
              <DialogClose asChild>
                <Button className='delete'>Anuluj</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
