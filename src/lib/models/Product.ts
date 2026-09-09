import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  category: 'clothing' | 'accessories' | 'jewelry' | 'shoes' | 'outfit';
  subcategory: string;
  price: number;
  cost: number;
  sku: string;
  images: string[];
  colors: string[];
  sizes: string[];
  material: string;
  brand: string;
  ratings: number;
  reviews: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['clothing', 'accessories', 'jewelry', 'shoes', 'outfit'],
      required: true,
    },
    subcategory: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    cost: { type: Number, required: true, min: 0 },
    sku: { type: String, required: true, unique: true },
    images: [{ type: String }],
    colors: [{ type: String }],
    sizes: [{ type: String }],
    material: { type: String },
    brand: { type: String },
    ratings: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
