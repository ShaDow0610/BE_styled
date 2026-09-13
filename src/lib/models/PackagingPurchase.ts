import mongoose, { Schema, Document } from 'mongoose';

export interface IPackagingPurchase extends Document {
  nom: string;
  packaging_id?: mongoose.Schema.Types.ObjectId;
  quantite: number;
  prix_unitaire: number;
  montant_total: number;
  fournisseur?: string;
  date_achat: Date;
  notes?: string;
}

const PackagingPurchaseSchema = new Schema<IPackagingPurchase>(
  {
    nom: { type: String, required: true, trim: true },
    packaging_id: { type: Schema.Types.ObjectId, ref: 'Packaging' },
    quantite: { type: Number, required: true, min: 1 },
    prix_unitaire: { type: Number, required: true, min: 0 },
    montant_total: { type: Number, required: true, min: 0 },
    fournisseur: { type: String, trim: true, default: '' },
    date_achat: { type: Date, required: true, default: Date.now },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: false }
);

export default mongoose.models.PackagingPurchase ||
  mongoose.model<IPackagingPurchase>('PackagingPurchase', PackagingPurchaseSchema);
