import { getCurrentPlacementId } from '@/utils/bitrix24.ts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { InvoiceData } from '@/models/bitrix/invoice.ts';
import {
  getClientDueInvoices,
  getInvoice,
  getInvoiceFields,
  updateInvoicePayment,
} from '@/api/bitrix/invoice.ts';
import { formatMoney } from '@/utils/money.ts';
import { useGetUnpaidInvoices } from '@/utils/invoice.ts';
import { z } from 'zod';
import { validatePrice } from '@/utils/validation.ts';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button.tsx';
import { pl } from 'react-day-picker/locale';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form.tsx';
import { EnumFieldItem, EnumFieldMeta } from '@/models/bitrix/field.ts';
import {
  INVOICE_PAYMENT_STATUS_FIELD,
  INVOICE_PAYMENT_TYPE_FIELD,
} from '@/data/bitrix/field.ts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover.tsx';
import { cn } from '@/lib/utils.ts';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar.tsx';
import { INVOICE_CLIENT_TYPES } from '@/data/bitrix/const.ts';

export default function AcceptPayment() {
  const [error, setError] = useState<string>('');

  const [invoice, setInvoice] = useState<InvoiceData>();
  const [paymentStatuses, setPaymentStatuses] =
    useState<Array<EnumFieldItem>>();
  const [paymentTypes, setPaymentTypes] = useState<Array<EnumFieldItem>>();
  const [invoices, setInvoices] = useState<Array<InvoiceData>>();

  const unpaidInvoices = useGetUnpaidInvoices(invoices);
  const paymentLeft = invoice?.paymentLeft ?? 0;

  const formSchema = useMemo(
    () =>
      z.object({
        amountPaid: validatePrice().refine(
          (val) => Number(val) <= paymentLeft,
          {
            message: 'Kwota nie może przekraczać kwoty zamówienia',
          },
        ),
        paymentStatus: z.string().min(1, 'Wybierz status płatności z listy'),
        paymentType: z.string().min(1, 'Wybierz rodzaj płatności z listy'),
        nextPaymentDue: z
          .date({
            error: 'Data nie może być pusta',
          })
          .min(new Date(), { message: 'Data nie może być z przeszłości' }),
      }),
    [paymentLeft],
  );

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amountPaid: '0',
      paymentStatus: '',
      paymentType: '',
      nextPaymentDue: undefined,
    },
    mode: 'onChange',
  });

  const watchedForm = useWatch({ control: form.control });
  const watchedAmountPaid = +(watchedForm.amountPaid ?? 0);

  const leftToPay = paymentLeft - watchedAmountPaid;

  const onSubmit = useCallback(
    (values: z.infer<typeof formSchema>) => {
      const nextPaymentDue = format(values.nextPaymentDue, 'yyyy-MM-dd');

      void updateInvoicePayment(getCurrentPlacementId(), {
        paymentLeft: paymentLeft - +values.amountPaid,
        amountPaid: +values.amountPaid,
        paymentStatus: values.paymentStatus,
        nextPaymentDue: nextPaymentDue,
        paymentType: values.paymentType,
      });
    },
    [paymentLeft],
  );

  useEffect(() => {
    const placementId = getCurrentPlacementId();

    if (!placementId) {
      setError('Nie udało się pobrać ID faktury');
      return;
    }

    getInvoiceFields().then((res) => {
      if (res) {
        const statusField = res[INVOICE_PAYMENT_STATUS_FIELD] as EnumFieldMeta;
        const paymentTypeField = res[
          INVOICE_PAYMENT_TYPE_FIELD
        ] as EnumFieldMeta;

        setPaymentStatuses(statusField.items);
        setPaymentTypes(paymentTypeField.items);
      } else {
        setError('Nie udało się pobrać pól faktury');
      }
    });

    getInvoice(placementId).then((res) => {
      if (res) {
        setInvoice(res);

        if (res.clientType === INVOICE_CLIENT_TYPES.COMPANY && res.company) {
          getClientDueInvoices({
            companyId: res.company.id,
          }).then((res) => setInvoices(res));
        } else if (
          res.clientType === INVOICE_CLIENT_TYPES.INDIVIDUAL &&
          res.contact
        ) {
          getClientDueInvoices({
            contactId: res.contact.id,
          }).then((res) => setInvoices(res));
        } else {
          setError(
            'Faktura nie ma uzupełnionego typu klienta/pole klienta puste',
          );
        }
      } else {
        setError('Nie udało się pobrać faktury');
      }
    });
  }, []);

  return paymentStatuses && paymentTypes && invoice && invoices && !error ? (
    <div>
      <div className='grid grid-cols-2 gap-x-2 gap-y-5'>
        <div>
          <h2 className='font-bold'>Nazwa klienta</h2>
          <p>{invoice.clientName}</p>
        </div>

        <div>
          <h2 className='font-bold'>Status innych płatności</h2>
          <div>
            <p>
              <span className='font-bold'>Suma nieopłaconych faktur:</span>{' '}
              {formatMoney(unpaidInvoices)}
            </p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th colSpan={2}>Dane sprzedaży</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>Nazwa deal</th>
              <td>{invoice.deal?.title ?? 'brak'}</td>
            </tr>
            <tr>
              <th>Kwota do zapłaty</th>
              <td>{formatMoney(paymentLeft)}</td>
            </tr>
            <tr>
              <th>Kwota zamówienia</th>
              <td>{formatMoney(invoice.orderAmount ?? 0)}</td>
            </tr>
            <tr>
              <th>Wariant płatności</th>
              <td>{invoice.paymentVariant}</td>
            </tr>
            <tr>
              <th>Sposób płatności</th>
              <td>{invoice.paymentType}</td>
            </tr>
            <tr>
              <th>Etap płatności</th>
              <td>{invoice.paymentStage}</td>
            </tr>
            <tr>
              <th>Termin płatności</th>
              <td>
                {invoice.paymentDue
                  ? new Date(invoice.paymentDue).toLocaleDateString()
                  : 'brak'}
              </td>
            </tr>
          </tbody>
        </table>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <table className='w-full'>
              <thead>
                <tr>
                  <th colSpan={2}>Przyjmij płatność</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>Wpłacana kwota</th>
                  <td>
                    <FormField
                      control={form.control}
                      name='amountPaid'
                      render={({ field }) => (
                        <FormItem className='items-center flex flex-col'>
                          <FormControl>
                            <input
                              type='number'
                              className='w-[150px] text-center'
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className='max-w-[150px]' />
                        </FormItem>
                      )}
                    />
                  </td>
                </tr>
                <tr>
                  <th>Status płatności</th>
                  <td>
                    <FormField
                      control={form.control}
                      name='paymentStatus'
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <SelectTrigger className='w-[200px]'>
                                <SelectValue placeholder='Wybierz...' />
                              </SelectTrigger>
                              <SelectContent>
                                {paymentStatuses.map((paymentStatus) => (
                                  <SelectItem
                                    key={paymentStatus.ID}
                                    value={paymentStatus.ID}
                                  >
                                    {paymentStatus.VALUE}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </td>
                </tr>
                <tr>
                  <th>Sposób płatności</th>
                  <td>
                    <FormField
                      control={form.control}
                      name='paymentType'
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <SelectTrigger className='w-[200px]'>
                                <SelectValue placeholder='Wybierz...' />
                              </SelectTrigger>
                              <SelectContent>
                                {paymentTypes.map((paymentType) => (
                                  <SelectItem
                                    key={paymentType.ID}
                                    value={paymentType.ID}
                                  >
                                    {paymentType.VALUE}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </td>
                </tr>
                <tr>
                  <th>Pozostało do zapłaty</th>
                  <td>{formatMoney(leftToPay)}</td>
                </tr>
                <tr>
                  <th>Termin kolejnej płatności</th>
                  <td>
                    <FormField
                      control={form.control}
                      name='nextPaymentDue'
                      render={({ field }) => (
                        <FormItem className='flex flex-col'>
                          <FormControl>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant='outline'
                                  className={cn(
                                    'justify-start text-left font-normal',
                                    !field.value && 'text-muted-foreground',
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, 'PPP')
                                  ) : (
                                    <span>Wybierz datę</span>
                                  )}
                                  <CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className='p-0' align='start'>
                                <Calendar
                                  className='w-full'
                                  mode='single'
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date < new Date()}
                                  locale={pl}
                                />
                              </PopoverContent>
                            </Popover>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            <Button
              disabled={!form.formState.isValid || form.formState.isSubmitting}
              type='submit'
              className='confirm mt-4'
            >
              Zapisz
            </Button>
          </form>
        </Form>
      </div>
    </div>
  ) : (
    <>
      {error && <h1>{error}</h1>}
      {!error && <h1>Ładowanie danych faktury...</h1>}
    </>
  );
}
