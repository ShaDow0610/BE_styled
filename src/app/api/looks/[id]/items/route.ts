import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import LookItem from '@/lib/models/LookItem';
import { canWrite, getRole } from '@/lib/authz';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const item = await LookItem.create({
      look_id: id,
      product_variant_id: body.product_variant_id,
    });
    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    console.error('Error adding look item:', error);
    return NextResponse.json({ success: false, error: 'Failed to add look item' }, { status: 500 });
  }
}
