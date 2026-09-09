import mongoose, { Schema, Document } from 'mongoose';

export interface ILook extends Document {
  nom: string;
  prix_pack: number;
  photo_couverture?: string;
}

const LookSchema = new Schema<ILook>({
  nom: { type: String, required: true, trim: true },
  prix_pack: { type: Number, required: true, min: 0 },
  photo_couverture: { type: String, default: '' },
});

export default mongoose.models.Look || mongoose.model<ILook>('Look', LookSchema);
