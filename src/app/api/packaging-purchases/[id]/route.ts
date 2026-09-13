import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import PackagingPurchase from '@/lib/models/PackagingPurchase';
import { isAdmin, getRole } from '@/lib/authz';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    if (!isAdmin(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;

    const purchase = await PackagingPurchase.findByIdAndDelete(id);
    if (!purchase) {
      return NextResponse.json({ success: false, error: 'Purchase not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting packaging purchase:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete packaging purchase' }, { status: 500 });
  }
}
