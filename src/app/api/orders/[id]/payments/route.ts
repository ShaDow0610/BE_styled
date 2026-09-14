import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import Payment from '@/lib/models/Payment';
import OrderTracking from '@/lib/models/OrderTracking';
import { canWrite, canSeeFinancials, getRole } from '@/lib/authz';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    if (!canSeeFinancials(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;
    const payments = await Payment.find({ order_tracking_id: id }).sort({ date_paiement: -1 }).lean();
    return NextResponse.json({ success: true, data: payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const montant = Number(body.montant);
    if (!montant || montant <= 0) {
      return NextResponse.json({ success: false, error: 'Montant invalide' }, { status: 400 });
    }

    const order = await OrderTracking.exists({ _id: id });
    if (!order) {
      return NextResponse.json({ success: false, error: 'Commande introuvable' }, { status: 404 });
    }

    // Permet de dater un encaissement dans le passé (paiement reçu au
    // moment d'une vente rétroactive) plutôt que de toujours prendre "maintenant".
    let date_paiement = new Date();
    if (body.date_paiement) {
      const parsed = new Date(body.date_paiement);
      if (Number.isNaN(parsed.getTime()) || parsed.getTime() > Date.now()) {
        return NextResponse.json({ success: false, error: 'Date invalide' }, { status: 400 });
      }
      date_paiement = parsed;
    }

    const payment = await Payment.create({
      order_tracking_id: id,
      montant,
      mode_paiement: body.mode_paiement || 'especes',
      note: body.note || undefined,
      date_paiement,
    });

    return NextResponse.json({ success: true, data: payment }, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ success: false, error: 'Failed to create payment' }, { status: 500 });
  }
}
