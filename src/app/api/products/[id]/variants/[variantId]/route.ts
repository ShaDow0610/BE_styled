import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import ProductVariant from '@/lib/models/ProductVariant';
import { canWrite, getRole } from '@/lib/authz';

type Params = { params: Promise<{ id: string; variantId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { variantId } = await params;
    const body = await request.json();

    const variant = await ProductVariant.findByIdAndUpdate(variantId, body, { new: true });
    if (!variant) {
      return NextResponse.json({ success: false, error: 'Variant not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: variant });
  } catch (error) {
    console.error('Error updating variant:', error);
    return NextResponse.json({ success: false, error: 'Failed to update variant' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { variantId } = await params;

    const variant = await ProductVariant.findByIdAndDelete(variantId);
    if (!variant) {
      return NextResponse.json({ success: false, error: 'Variant not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting variant:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete variant' }, { status: 500 });
  }
}
