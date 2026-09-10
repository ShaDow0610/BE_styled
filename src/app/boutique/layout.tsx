import BoutiqueHeader from "./components/BoutiqueHeader";
import BoutiqueFooter from "./components/BoutiqueFooter";
import { CurrencyProvider } from "./components/CurrencyProvider";
import { dbConnect } from "@/lib/db/connection";
import ExchangeRate from "@/lib/models/ExchangeRate";

const DEFAULT_RATES = { xaf_par_usd: 610, xaf_par_eur: 655 };

async function getRates() {
  try {
    await dbConnect();
    const rate = await ExchangeRate.findOne().lean();
    if (!rate) return DEFAULT_RATES;
    return { xaf_par_usd: rate.xaf_par_usd, xaf_par_eur: rate.xaf_par_eur };
  } catch {
    return DEFAULT_RATES;
  }
}

export default async function BoutiqueLayout({ children }: { children: React.ReactNode }) {
  const rates = await getRates();

  return (
    <CurrencyProvider initialRates={rates}>
      <div className="min-h-screen bg-ivory flex flex-col">
        <BoutiqueHeader />
        <main className="flex-1">{children}</main>
        <BoutiqueFooter />
      </div>
    </CurrencyProvider>
  );
}
