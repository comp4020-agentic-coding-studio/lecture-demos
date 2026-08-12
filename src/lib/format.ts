export function splitPrice(value: number): { whole: string; cents: string } {
  const fixed = value.toFixed(2);
  const [whole, cents] = fixed.split(".");
  return { whole: `$${whole}`, cents: `.${cents}` };
}

export function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}
