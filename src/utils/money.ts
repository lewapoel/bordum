export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2, // no decimals if integer
    maximumFractionDigits: 2, // up to 2 decimals
  }).format(amount);
}

export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}
