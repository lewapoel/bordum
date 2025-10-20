import { z } from 'zod';

export function validateNonNegativeInput(name: string) {
  return z
    .string()
    .min(1, `${name} jest wymagana`)
    .refine((val) => !isNaN(parseFloat(val)), {
      message: `${name} musi być liczbą`,
    })
    .refine((val) => parseFloat(val) >= 0, {
      message: `${name} nie może być ujemna`,
    });
}

export function validatePrice() {
  return z
    .string()
    .min(1, 'Cena jest wymagana')
    .refine((val) => !isNaN(parseFloat(val)), {
      message: 'Cena musi być liczbą',
    })
    .refine((val) => parseFloat(val) >= 0, {
      message: 'Cena nie może być ujemna',
    })
    .refine((val) => Number.isInteger(parseFloat(val) * 100), {
      message: 'Cena nie może mieć więcej niż 2 miejsca po przecinku',
    });
}
