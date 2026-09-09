import mongoose, { Schema, Document } from 'mongoose';

export const PRODUCT_CATEGORIES = [
  'pantalon',
  'chemise',
  'tricot',
  'culotte',
  'bracelet',
  'montre',
  'chaussure',
  'bague',
  'chapeau',
  'lunette',
  'autre',
] as const;

export const PRODUCT_STATUSES = [
  'brouillon',
  'en_commande',
  'en_transit',
  'en_confection',
  'disponible',
  'rupture',
  'archive',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export interface IProduct extends Document {
  nom: string;
  reference: string;
  categorie: ProductCategory;
  origine: 'import_chine' | 'local';
  description: string;
  marque_partenaire_id?: mongoose.Schema.Types.ObjectId;
  fournisseur_id?: mongoose.Schema.Types.ObjectId;
  poids_kg: number;
  statut: ProductStatus;
  date_creation: Date;
}

const ProductSchema = new Schema<IProduct>({
  nom: { type: String, required: true, trim: true },
  reference: { type: String, required: true, unique: true, trim: true },
  categorie: { type: String, enum: PRODUCT_CATEGORIES, required: true },
  origine: { type: String, enum: ['import_chine', 'local'], required: true },
  description: { type: String, default: '' },
  marque_partenaire_id: { type: Schema.Types.ObjectId, ref: 'Brand', default: null },
  fournisseur_id: { type: Schema.Types.ObjectId, ref: 'Supplier', default: null },
  poids_kg: { type: Number, default: 0, min: 0 },
  statut: { type: String, enum: PRODUCT_STATUSES, default: 'brouillon' },
  date_creation: { type: Date, default: Date.now },
});

ProductSchema.index({ categorie: 1 });
ProductSchema.index({ statut: 1 });
ProductSchema.index({ origine: 1 });

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
