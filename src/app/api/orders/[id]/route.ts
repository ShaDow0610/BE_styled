import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import OrderTracking, { ORDER_STATUSES } from '@/lib/models/OrderTracking';
import { canWrite, getRole } from '@/lib/authz';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const order = await OrderTracking.findById(id);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const update: Record<string, unknown> = {};

    if (body.statut !== undefined) {
      if (!ORDER_STATUSES.includes(body.statut)) {
        return NextResponse.json({ success: false, error: 'Statut invalide' }, { status: 400 });
      }
      update.statut = body.statut;
      // Une transition de statut normale (kanban) date la mise à jour à
      // aujourd'hui ; une vente rétroactive fournit sa propre date_maj
      // ci-dessous, qui prévaut alors sur ce comportement par défaut.
      update.date_maj = new Date();
    }

    // Permet de corriger le prix d'une ligne après coup (ex: répartition
    // d'un montant total encaissé sur plusieurs articles sans prix connu
    // à l'unité) — recalcule le montant total à partir de la quantité déjà
    // enregistrée.
    const prixSaisi = Number(body.prix_unitaire);
    if (prixSaisi > 0) {
      update.prix_unitaire = Math.round(prixSaisi * 100) / 100;
      update.montant_total = Math.round(prixSaisi * order.quantite * 100) / 100;
    }

    if (body.date_maj) {
      const date_maj = new Date(body.date_maj);
      if (Number.isNaN(date_maj.getTime()) || date_maj.getTime() > Date.now()) {
        return NextResponse.json({ success: false, error: 'Date invalide' }, { status: 400 });
      }
      update.date_maj = date_maj;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, error: 'Aucune modification fournie' }, { status: 400 });
    }

    Object.assign(order, update);
    await order.save();

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error('Error updating order tracking entry:', error);
    return NextResponse.json({ success: false, error: 'Failed to update order tracking entry' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;

    const order = await OrderTracking.findById(id);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }
    if (order.facture_id) {
      return NextResponse.json({ success: false, error: 'Cette entrée est déjà facturée' }, { status: 400 });
    }

    await order.deleteOne();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting order tracking entry:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete order tracking entry' }, { status: 500 });
  }
}
