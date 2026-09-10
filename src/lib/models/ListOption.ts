import mongoose, { Schema, Document } from 'mongoose';

export interface IListOption extends Document {
  type: 'couleur' | 'taille' | 'matiere';
  valeur: string;
}

const ListOptionSchema = new Schema<IListOption>({
  type: { type: String, enum: ['couleur', 'taille', 'matiere'], required: true },
  valeur: { type: String, required: true, trim: true },
});

ListOptionSchema.index({ type: 1, valeur: 1 }, { unique: true });

export default mongoose.models.ListOption || mongoose.model<IListOption>('ListOption', ListOptionSchema);
