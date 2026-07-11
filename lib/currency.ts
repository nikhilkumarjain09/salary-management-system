export const CURRENCY_RATES: Record<string, number> = {
  USD: 1.0,
  INR: 83.0,
  GBP: 0.78,
  EUR: 0.92,
  SGD: 1.34,
  BRL: 5.0,
  CAD: 1.36,
  AUD: 1.50,
  JPY: 155.0,
  AED: 3.67,
  CHF: 0.90,
};

export function convertToUSD(amount: number, currency: string): number {
  const rate = CURRENCY_RATES[currency] || 1.0;
  return Number((amount / rate).toFixed(2));
}

export function convertFromUSD(amountUSD: number, currency: string): number {
  const rate = CURRENCY_RATES[currency] || 1.0;
  return Number((amountUSD * rate).toFixed(2));
}
