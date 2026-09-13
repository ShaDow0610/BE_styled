import mongoose, { Schema, Document } from 'mongoose';

export interface IPackaging extends Document {
  nom: string;
  prix_unitaire: number;
  actif: boolean;
}

const PackagingSchema = new Schema<IPackaging>({
  nom: { type: String, required: true, trim: true, unique: true },
  prix_unitaire: { type: Number, required: true, min: 0 },
  actif: { type: Boolean, default: true },
});

export default mongoose.models.Packaging || mongoose.model<IPackaging>('Packaging', PackagingSchema);
