import mongoose, { Schema, Document } from 'mongoose';

export interface ILookItem extends Document {
  look_id: mongoose.Schema.Types.ObjectId;
  product_variant_id: mongoose.Schema.Types.ObjectId;
}

const LookItemSchema = new Schema<ILookItem>({
  look_id: { type: Schema.Types.ObjectId, ref: 'Look', required: true },
  product_variant_id: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
});

LookItemSchema.index({ look_id: 1 });

export default mongoose.models.LookItem || mongoose.model<ILookItem>('LookItem', LookItemSchema);
