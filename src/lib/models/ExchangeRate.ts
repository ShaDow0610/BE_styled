import mongoose, { Schema, Document } from 'mongoose';

/**
 * Document singleton : un seul enregistrement pour toute la collection,
 * mis à jour via upsert (`{}` en filtre). Pas d'API externe — le taux est
 * saisi manuellement par un admin (src/app/(app)/admin/exchange-rates).
 */
export interface IExchangeRate extends Document {
  xaf_par_usd: number;
  xaf_par_eur: number;
  date_maj: Date;
}

const ExchangeRateSchema = new Schema<IExchangeRate>({
  xaf_par_usd: { type: Number, required: true },
  xaf_par_eur: { type: Number, required: true },
  date_maj: { type: Date, default: Date.now },
});

export default mongoose.models.ExchangeRate || mongoose.model<IExchangeRate>('ExchangeRate', ExchangeRateSchema);
