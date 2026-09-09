import { dbConnect } from "@/lib/db/connection";
import PromoCode from "@/lib/models/PromoCode";

export default async function PromoBanner() {
  await dbConnect();
  const promo = await PromoCode.findOne({ actif: true }).sort({ _id: -1 }).lean();

  if (!promo) return null;

  return (
    <div className="bg-ink text-ivory text-center py-3 text-sm tracking-wide">
      Profitez de <span className="font-semibold">{promo.reduction_pourcentage}%</span> de
      réduction avec le code{" "}
      <span className="font-serif font-semibold">{promo.code}</span> — mentionnez-le sur
      WhatsApp lors de votre commande.
    </div>
  );
}
