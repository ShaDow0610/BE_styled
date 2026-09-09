import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import ProductVariant from '@/lib/models/ProductVariant';
import { canWrite, getRole } from '@/lib/authz';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { id } = await params;
    const variants = await ProductVariant.find({ product_id: id }).lean();
    return NextResponse.json({ success: true, data: variants });
  } catch (error) {
    console.error('Error fetching variants:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch variants' }, { status: 500 });
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

    const variant = await ProductVariant.create({ ...body, product_id: id });
    return NextResponse.json({ success: true, data: variant }, { status: 201 });
  } catch (error) {
    console.error('Error creating variant:', error);
    return NextResponse.json({ success: false, error: 'Failed to create variant' }, { status: 500 });
  }
}
