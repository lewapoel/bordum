import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeIndex(len: number, index: number) {
  // Wrap around
  if (index < 0) index = len + index;
  if (index >= len) index = index - len;

  return Math.max(0, Math.min(len - 1, index));
}
