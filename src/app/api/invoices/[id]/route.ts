import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import Invoice from '@/lib/models/Invoice';
import Payment from '@/lib/models/Payment';
import { canWrite, getRole } from '@/lib/authz';

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
