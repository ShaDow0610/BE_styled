import mongoose, { Schema, Document } from 'mongoose';

interface IInvoiceLine {
  order_tracking_id: mongoose.Schema.Types.ObjectId;
  produit_nom: string;
  couleur?: string;
  taille?: string;
  quantite: number;
  prix_unitaire: number;
  montant_total: number;
}

export interface IInvoice extends Document {
  numero_facture: string;
  client_nom: string;
  client_telephone?: string;
  client_adresse?: string;
  date_facture: Date;
  lignes: IInvoiceLine[];
  order_tracking_ids: mongoose.Schema.Types.ObjectId[];
  montant_total: number;
  date_creation: Date;
}

const InvoiceLineSchema = new Schema<IInvoiceLine>(
  {
    order_tracking_id: { type: Schema.Types.ObjectId, ref: 'OrderTracking', required: true },
    produit_nom: { type: String, required: true },
    couleur: { type: String, default: '' },
    taille: { type: String, default: '' },
    quantite: { type: Number, required: true },
    prix_unitaire: { type: Number, required: true },
    montant_total: { type: Number, required: true },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>({
  numero_facture: { type: String, required: true, unique: true },
  client_nom: { type: String, required: true, trim: true },
  client_telephone: { type: String, default: '' },
  client_adresse: { type: String, default: '' },
  date_facture: { type: Date, default: Date.now },
  lignes: { type: [InvoiceLineSchema], required: true },
  order_tracking_ids: [{ type: Schema.Types.ObjectId, ref: 'OrderTracking' }],
  montant_total: { type: Number, required: true },
  date_creation: { type: Date, default: Date.now },
});

InvoiceSchema.index({ date_creation: -1 });

export default mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);
