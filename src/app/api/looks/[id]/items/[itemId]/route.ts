import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import LookItem from '@/lib/models/LookItem';
import { canWrite, getRole } from '@/lib/authz';

type Params = { params: Promise<{ id: string; itemId: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { itemId } = await params;

    const item = await LookItem.findByIdAndDelete(itemId);
    if (!item) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting look item:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete look item' }, { status: 500 });
  }
}
