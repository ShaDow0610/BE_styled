"use client";

import { useCurrency } from "./CurrencyProvider";

export default function Price({ xaf, className }: { xaf: number | null | undefined; className?: string }) {
  const { formatPrice } = useCurrency();
  if (xaf == null) return null;
  return <span className={className}>{formatPrice(xaf)}</span>;
}
