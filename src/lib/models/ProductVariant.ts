import mongoose, { Schema, Document } from 'mongoose';

export interface IProductVariant extends Document {
  product_id: mongoose.Schema.Types.ObjectId;
  taille: string;
  couleur: string;
  modele?: string;
  stock_quantite: number;
  seuil_alerte: number;
  sku_variante: string;
}

const ProductVariantSchema = new Schema<IProductVariant>({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  taille: { type: String, required: true },
  couleur: { type: String, required: true },
  modele: { type: String },
  stock_quantite: { type: Number, default: 0, min: 0 },
  seuil_alerte: { type: Number, default: 5, min: 0 },
  sku_variante: { type: String, required: true, unique: true },
});

ProductVariantSchema.index({ product_id: 1 });

export default mongoose.models.ProductVariant ||
  mongoose.model<IProductVariant>('ProductVariant', ProductVariantSchema);
