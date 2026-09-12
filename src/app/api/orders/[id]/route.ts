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

    if (!ORDER_STATUSES.includes(body.statut)) {
      return NextResponse.json({ success: false, error: 'Statut invalide' }, { status: 400 });
    }

    const order = await OrderTracking.findByIdAndUpdate(
      id,
      { statut: body.statut, date_maj: new Date() },
      { new: true }
    );
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error('Error updating order tracking entry:', error);
    return NextResponse.json({ success: false, error: 'Failed to update order tracking entry' }, { status: 500 });
  }
}
