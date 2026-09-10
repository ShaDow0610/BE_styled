import mongoose, { Schema, Document } from 'mongoose';

export interface IProductPricing extends Document {
  product_id: mongoose.Schema.Types.ObjectId;
  // Absent/null = prix par défaut du produit (s'applique à tout modèle qui
  // n'a pas de prix spécifique). Renseigné = prix propre à ce modèle.
  modele?: string;
  date_effet: Date;
  cout_achat: number;
  devise_achat: 'CNY' | 'USD' | 'XAF';
  taux_change_applique: number;
  cout_transport: number;
  mode_transport: 'avion' | 'bateau' | 'local';
  delai_estime_jours: number;
  cout_douane: number;
  cout_packaging: number;
  cout_main_oeuvre: number;
  marge_pourcentage: number;
  prix_revient_total: number;
  prix_revente_final: number;
  raison_changement?: string;
}

const ProductPricingSchema = new Schema<IProductPricing>({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  modele: { type: String, default: null },
  date_effet: { type: Date, default: Date.now },
  cout_achat: { type: Number, required: true, min: 0 },
  devise_achat: { type: String, enum: ['CNY', 'USD', 'XAF'], required: true },
  taux_change_applique: { type: Number, required: true, min: 0 },
  cout_transport: { type: Number, default: 0, min: 0 },
  mode_transport: { type: String, enum: ['avion', 'bateau', 'local'], required: true },
  delai_estime_jours: { type: Number, default: 0, min: 0 },
  cout_douane: { type: Number, default: 0, min: 0 },
  cout_packaging: { type: Number, default: 0, min: 0 },
  cout_main_oeuvre: { type: Number, default: 0, min: 0 },
  marge_pourcentage: { type: Number, required: true, min: 0 },
  // Calculés côté serveur uniquement (src/lib/pricing.ts) — jamais reçus du client.
  prix_revient_total: { type: Number, required: true },
  prix_revente_final: { type: Number, required: true },
  raison_changement: { type: String },
});

ProductPricingSchema.index({ product_id: 1, modele: 1, date_effet: -1 });

export default mongoose.models.ProductPricing ||
  mongoose.model<IProductPricing>('ProductPricing', ProductPricingSchema);
