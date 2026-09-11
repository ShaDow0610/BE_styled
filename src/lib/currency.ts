export type Currency = 'XAF' | 'USD' | 'EUR';

export interface Rates {
  xaf_par_usd: number;
  xaf_par_eur: number;
}

const XAF_FORMATTER = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const USD_FORMATTER = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const EUR_FORMATTER = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

export function convertPrice(xafAmount: number, currency: Currency, rates: Rates): number {
  if (currency === 'XAF') return xafAmount;
  if (currency === 'USD') return xafAmount / rates.xaf_par_usd;
  return xafAmount / rates.xaf_par_eur;
}

export function formatPrice(xafAmount: number | null | undefined, currency: Currency, rates: Rates): string {
  if (xafAmount == null) return '—';
  const converted = convertPrice(xafAmount, currency, rates);
  if (currency === 'XAF') return `${XAF_FORMATTER.format(converted)} FCFA`;
  if (currency === 'USD') return USD_FORMATTER.format(converted);
  return EUR_FORMATTER.format(converted);
}

/** Back-office : toujours XAF brut, pas de sélecteur de devise. */
export function formatXAF(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `${XAF_FORMATTER.format(amount)} FCFA`;
}
