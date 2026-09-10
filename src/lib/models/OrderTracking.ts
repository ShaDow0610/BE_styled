import mongoose, { Schema, Document } from 'mongoose';

export const ORDER_STATUSES = [
  'commande',
  'en_transit',
  'recu',
  'en_confection',
  'pret',
  'livre_client',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface IOrderTracking extends Document {
  product_variant_id: mongoose.Schema.Types.ObjectId;
  type: 'reappro_fournisseur' | 'commande_client';
  statut: OrderStatus;
  quantite: number;
  // Prix figé au moment de la commande (résolu selon le modèle de la
  // variante) — reste correct pour une facture même si le prix change
  // ensuite. Non renseigné pour les réappros fournisseur (pas de vente).
  prix_unitaire?: number;
  montant_total?: number;
  // Empêche d'appliquer deux fois l'effet sur le stock si le statut est
  // modifié plusieurs fois après avoir atteint son état terminal.
  stock_applique: boolean;
  date_maj: Date;
}

const OrderTrackingSchema = new Schema<IOrderTracking>({
  product_variant_id: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
  type: { type: String, enum: ['reappro_fournisseur', 'commande_client'], required: true },
  statut: { type: String, enum: ORDER_STATUSES, default: 'commande' },
  quantite: { type: Number, required: true, min: 1 },
  prix_unitaire: { type: Number, default: null },
  montant_total: { type: Number, default: null },
  stock_applique: { type: Boolean, default: false },
  date_maj: { type: Date, default: Date.now },
});

OrderTrackingSchema.index({ statut: 1 });
OrderTrackingSchema.index({ type: 1, statut: 1, date_maj: -1 });

export default mongoose.models.OrderTracking ||
  mongoose.model<IOrderTracking>('OrderTracking', OrderTrackingSchema);
