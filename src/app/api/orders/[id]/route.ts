import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import OrderTracking, { ORDER_STATUSES } from '@/lib/models/OrderTracking';
import ProductVariant from '@/lib/models/ProductVariant';
import { canWrite, getRole } from '@/lib/authz';

type Params = { params: Promise<{ id: string }> };

// Statut terminal par type d'entrée : atteindre celui-ci déclenche l'effet
// sur le stock (une seule fois, protégé par `stock_applique`).
const TERMINAL_STATUS: Record<string, string> = {
  reappro_fournisseur: 'recu',
  commande_client: 'livre_client',
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    if (!ORDER_STATUSES.includes(body.statut)) {
      return NextResponse.json({ success: false, error: 'Statut invalide' }, { status: 400 });
    }

    const existing = await OrderTracking.findById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const order = await OrderTracking.findByIdAndUpdate(
      id,
      { statut: body.statut, date_maj: new Date() },
      { new: true }
    );

    const reachedTerminal = !existing.stock_applique && body.statut === TERMINAL_STATUS[existing.type];
    if (reachedTerminal && order) {
      const delta = existing.type === 'reappro_fournisseur' ? existing.quantite : -existing.quantite;
      const variant = await ProductVariant.findById(existing.product_variant_id);
      if (variant) {
        variant.stock_quantite = Math.max(0, variant.stock_quantite + delta);
        await variant.save();
      }
      order.stock_applique = true;
      await order.save();
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error('Error updating order tracking entry:', error);
    return NextResponse.json({ success: false, error: 'Failed to update order tracking entry' }, { status: 500 });
  }
}
