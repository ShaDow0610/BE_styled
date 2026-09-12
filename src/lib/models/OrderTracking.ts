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
  product_id: mongoose.Schema.Types.ObjectId;
  // Couleur/taille choisies au moment de la vente/réappro — informatives,
  // pas une référence vers une entité (il n'y a plus de variante en base).
  couleur?: string;
  taille?: string;
  type: 'reappro_fournisseur' | 'commande_client';
  statut: OrderStatus;
  quantite: number;
  // Prix figé au moment de la commande — reste correct pour une facture
  // même si le prix du produit change ensuite. Non renseigné pour les
  // réappros fournisseur (pas de vente).
  prix_unitaire?: number;
  montant_total?: number;
  date_maj: Date;
  // Renseigné une fois la ligne incluse dans une facture — empêche de la
  // sélectionner une seconde fois (double facturation).
  facture_id?: mongoose.Schema.Types.ObjectId;
}

const OrderTrackingSchema = new Schema<IOrderTracking>({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  couleur: { type: String, default: '' },
  taille: { type: String, default: '' },
  type: { type: String, enum: ['reappro_fournisseur', 'commande_client'], required: true },
  statut: { type: String, enum: ORDER_STATUSES, default: 'commande' },
  quantite: { type: Number, required: true, min: 1 },
  prix_unitaire: { type: Number, default: null },
  montant_total: { type: Number, default: null },
  date_maj: { type: Date, default: Date.now },
  facture_id: { type: Schema.Types.ObjectId, ref: 'Invoice', default: null },
});

OrderTrackingSchema.index({ statut: 1 });
OrderTrackingSchema.index({ type: 1, statut: 1, date_maj: -1 });

export default mongoose.models.OrderTracking ||
  mongoose.model<IOrderTracking>('OrderTracking', OrderTrackingSchema);
