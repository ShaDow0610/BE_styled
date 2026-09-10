"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Currency, Rates, formatPrice as formatPriceUtil } from "@/lib/currency";

const STORAGE_KEY = "be-styled-currency";

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPrice: (xafAmount: number | null | undefined) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({
  initialRates,
  children,
}: {
  initialRates: Rates;
  children: React.ReactNode;
}) {
  const [currency, setCurrencyState] = useState<Currency>("XAF");
  const [rates] = useState<Rates>(initialRates);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "XAF" || stored === "USD" || stored === "EUR") {
        setCurrencyState(stored);
      }
    } catch {
      // localStorage indisponible (navigation privée, etc.) : on reste en XAF
    }
  }, []);

  const setCurrency = (next: Currency) => {
    setCurrencyState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignoré
    }
  };

  const formatPrice = (xafAmount: number | null | undefined) => formatPriceUtil(xafAmount, currency, rates);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency doit être utilisé dans <CurrencyProvider>");
  return ctx;
}
