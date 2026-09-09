import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import OrderTracking from '@/lib/models/OrderTracking';
import { canWrite, getRole } from '@/lib/authz';

export async function GET() {
  try {
    await dbConnect();
    const orders = await OrderTracking.find()
      .sort({ date_maj: -1 })
      .populate({
        path: 'product_variant_id',
        select: 'taille couleur sku_variante product_id',
        populate: { path: 'product_id', select: 'nom' },
      })
      .lean();

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const body = await request.json();

    const order = await OrderTracking.create({
      product_variant_id: body.product_variant_id,
      type: body.type,
      statut: 'commande',
      date_maj: new Date(),
    });
    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error) {
    console.error('Error creating order tracking entry:', error);
    return NextResponse.json({ success: false, error: 'Failed to create order tracking entry' }, { status: 500 });
  }
}
