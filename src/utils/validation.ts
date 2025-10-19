import { z } from 'zod';

export function validateNonNegativeString(name: string) {
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
