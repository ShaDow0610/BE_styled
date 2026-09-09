import mongoose, { Schema, Document } from 'mongoose';

export interface ISupplier extends Document {
  nom: string;
  type: 'usine_chine' | 'couturier_local';
  delai_moyen_jours: number;
  contact: string;
  notes: string;
}

const SupplierSchema = new Schema<ISupplier>({
  nom: { type: String, required: true, trim: true },
  type: { type: String, enum: ['usine_chine', 'couturier_local'], required: true },
  delai_moyen_jours: { type: Number, default: 0, min: 0 },
  contact: { type: String, default: '' },
  notes: { type: String, default: '' },
});

export default mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', SupplierSchema);
