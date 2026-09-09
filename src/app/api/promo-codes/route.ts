import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import PromoCode from '@/lib/models/PromoCode';
import { canWrite, getRole } from '@/lib/authz';

export async function GET() {
  try {
    await dbConnect();
    const promoCodes = await PromoCode.find().sort({ code: 1 }).lean();
    return NextResponse.json({ success: true, data: promoCodes });
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch promo codes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const body = await request.json();
    const promoCode = await PromoCode.create(body);
    return NextResponse.json({ success: true, data: promoCode }, { status: 201 });
  } catch (error) {
    console.error('Error creating promo code:', error);
    return NextResponse.json({ success: false, error: 'Failed to create promo code' }, { status: 500 });
  }
}
