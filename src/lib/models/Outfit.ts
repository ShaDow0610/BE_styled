import mongoose, { Schema, Document } from 'mongoose';

export interface IOutfit extends Document {
  name: string;
  description: string;
  items: {
    productId: mongoose.Schema.Types.ObjectId;
    category: string;
    quantity: number;
  }[];
  image: string;
  season: string;
  occasion: string;
  totalPrice: number;
  color: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OutfitSchema = new Schema<IOutfit>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        category: String,
        quantity: { type: Number, default: 1 },
      },
    ],
    image: String,
    season: { type: String, enum: ['spring', 'summer', 'fall', 'winter', 'all'] },
    occasion: { type: String, enum: ['casual', 'formal', 'sport', 'party', 'business'] },
    totalPrice: { type: Number, default: 0 },
    color: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Outfit || mongoose.model<IOutfit>('Outfit', OutfitSchema);
