import mongoose, { Schema, Document } from 'mongoose';

export interface IStock extends Document {
  productId: mongoose.Schema.Types.ObjectId;
  sku: string;
  quantity: number;
  minQuantity: number;
  maxQuantity: number;
  warehouse: string;
  color: string;
  size: string;
  lastRestocked: Date;
  expirationDate?: Date;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  createdAt: Date;
  updatedAt: Date;
}

const StockSchema = new Schema<IStock>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    minQuantity: { type: Number, default: 5 },
    maxQuantity: { type: Number, default: 100 },
    warehouse: { type: String, default: 'Main' },
    color: { type: String },
    size: { type: String },
    lastRestocked: { type: Date, default: Date.now },
    expirationDate: { type: Date },
    status: {
      type: String,
      enum: ['in-stock', 'low-stock', 'out-of-stock'],
      default: 'in-stock',
    },
  },
  { timestamps: true }
);

// Index pour optimiser les recherches
StockSchema.index({ sku: 1, warehouse: 1 });
StockSchema.index({ productId: 1 });
StockSchema.index({ status: 1 });

export default mongoose.models.Stock || mongoose.model<IStock>('Stock', StockSchema);
