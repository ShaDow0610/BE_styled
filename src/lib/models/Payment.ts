import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  order_tracking_id: mongoose.Schema.Types.ObjectId;
  montant: number;
  mode_paiement: 'especes' | 'mobile_money' | 'virement' | 'autre';
  date_paiement: Date;
  note?: string;
}

const PaymentSchema = new Schema<IPayment>({
  order_tracking_id: { type: Schema.Types.ObjectId, ref: 'OrderTracking', required: true },
  montant: { type: Number, required: true, min: 0 },
  mode_paiement: { type: String, enum: ['especes', 'mobile_money', 'virement', 'autre'], default: 'especes' },
  date_paiement: { type: Date, default: Date.now },
  note: { type: String },
});

PaymentSchema.index({ order_tracking_id: 1 });

export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);
