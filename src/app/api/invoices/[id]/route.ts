import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import Invoice from '@/lib/models/Invoice';
import Payment from '@/lib/models/Payment';
import OrderTracking from '@/lib/models/OrderTracking';
import { canWrite, isAdmin, getRole } from '@/lib/authz';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;
    const invoice = await Invoice.findById(id).lean();
    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    const encaisseAgg = await Payment.aggregate([
      { $match: { order_tracking_id: { $in: invoice.order_tracking_ids } } },
      { $group: { _id: null, total: { $sum: '$montant' } } },
    ]);
    const montantEncaisse = Math.round((encaisseAgg[0]?.total ?? 0) * 100) / 100;
    const resteAPayer = Math.max(0, Math.round((invoice.montant_total - montantEncaisse) * 100) / 100);

    return NextResponse.json({ success: true, data: { ...invoice, montantEncaisse, resteAPayer } });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch invoice' }, { status: 500 });
  }
}

/**
 * Une facture est un document comptable : on n'autorise jamais de toucher
 * aux lignes/montants une fois émise. PATCH ne peut que :
 * - corriger les coordonnées client (fautes de frappe, changement de tél.) ;
 * - annuler la facture (statut, gardé pour l'historique/la numérotation —
 *   jamais de suppression réelle), ce qui libère les commandes associées
 *   pour qu'elles puissent être refacturées.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const role = getRole(request);
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    if (body.action === 'annuler') {
      if (!isAdmin(role)) {
        return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
      }
      if (invoice.statut === 'annulee') {
        return NextResponse.json({ success: false, error: 'Cette facture est déjà annulée' }, { status: 400 });
      }
      invoice.statut = 'annulee';
      await invoice.save();
      await OrderTracking.updateMany(
        { _id: { $in: invoice.order_tracking_ids } },
        { $set: { facture_id: null } }
      );
      return NextResponse.json({ success: true, data: invoice });
    }

    if (!canWrite(role)) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }
    if (invoice.statut === 'annulee') {
      return NextResponse.json({ success: false, error: 'Cette facture est annulée' }, { status: 400 });
    }

    const update: Record<string, string> = {};
    if (typeof body.client_nom === 'string' && body.client_nom.trim()) update.client_nom = body.client_nom.trim();
    if (typeof body.client_telephone === 'string') update.client_telephone = body.client_telephone.trim();
    if (typeof body.client_adresse === 'string') update.client_adresse = body.client_adresse.trim();

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, error: 'Rien à mettre à jour' }, { status: 400 });
    }

    Object.assign(invoice, update);
    await invoice.save();

    return NextResponse.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ success: false, error: 'Failed to update invoice' }, { status: 500 });
  }
}
