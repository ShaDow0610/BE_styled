import mongoose, { Schema, Document } from 'mongoose';

export interface ILienCarte {
  label: string;
  url: string;
}

export interface IBusinessCard extends Document {
  nom: string;
  organisation?: string;
  telephone?: string;
  liens: ILienCarte[];
}

const LienCarteSchema = new Schema<ILienCarte>(
  {
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
  },
  { _id: false }
);

// Document unique (singleton) — une seule carte de visite pour la boutique.
const BusinessCardSchema = new Schema<IBusinessCard>({
  nom: { type: String, required: true, trim: true, default: 'Be Styled' },
  organisation: { type: String, default: '' },
  telephone: { type: String, default: '' },
  liens: { type: [LienCarteSchema], default: [] },
});

export default mongoose.models.BusinessCard ||
  mongoose.model<IBusinessCard>('BusinessCard', BusinessCardSchema);
