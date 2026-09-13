import mongoose, { Schema, Document } from 'mongoose';

export interface IBrand extends Document {
  nom: string;
  categorie_accessoire: string;
  contact: string;
  conditions_commerciales: string;
  actif: boolean;
}

const BrandSchema = new Schema<IBrand>({
  nom: { type: String, required: true, trim: true },
  categorie_accessoire: { type: String, default: '' },
  contact: { type: String, default: '' },
  conditions_commerciales: { type: String, default: '' },
  actif: { type: Boolean, default: true },
});

export default mongoose.models.Brand || mongoose.model<IBrand>('Brand', BrandSchema);
