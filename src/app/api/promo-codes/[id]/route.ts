import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import PromoCode from '@/lib/models/PromoCode';
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

    const promoCode = await PromoCode.findByIdAndUpdate(id, body, { new: true });
    if (!promoCode) {
      return NextResponse.json({ success: false, error: 'Promo code not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: promoCode });
  } catch (error) {
    console.error('Error updating promo code:', error);
    return NextResponse.json({ success: false, error: 'Failed to update promo code' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;

    const promoCode = await PromoCode.findByIdAndDelete(id);
    if (!promoCode) {
      return NextResponse.json({ success: false, error: 'Promo code not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting promo code:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete promo code' }, { status: 500 });
  }
}
