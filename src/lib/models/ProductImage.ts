import mongoose, { Schema, Document } from 'mongoose';

export interface IProductImage extends Document {
  product_id: mongoose.Schema.Types.ObjectId;
  url: string;
  type: 'porte' | 'detail_tissu' | 'etiquette' | 'packshot';
  ordre_affichage: number;
}

const ProductImageSchema = new Schema<IProductImage>({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  url: { type: String, required: true },
  type: { type: String, enum: ['porte', 'detail_tissu', 'etiquette', 'packshot'], required: true },
  ordre_affichage: { type: Number, default: 0 },
});

ProductImageSchema.index({ product_id: 1, ordre_affichage: 1 });

export default mongoose.models.ProductImage ||
  mongoose.model<IProductImage>('ProductImage', ProductImageSchema);
