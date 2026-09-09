import mongoose, { Schema, Document } from 'mongoose';

export interface IPromoCode extends Document {
  code: string;
  reduction_pourcentage: number;
  source: string;
  nombre_utilisations: number;
  actif: boolean;
}

const PromoCodeSchema = new Schema<IPromoCode>({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  reduction_pourcentage: { type: Number, required: true, min: 0, max: 100 },
  source: { type: String, default: 'site_vitrine' },
  nombre_utilisations: { type: Number, default: 0 },
  actif: { type: Boolean, default: true },
});

export default mongoose.models.PromoCode || mongoose.model<IPromoCode>('PromoCode', PromoCodeSchema);
