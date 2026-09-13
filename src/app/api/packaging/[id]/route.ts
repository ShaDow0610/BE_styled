import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import Packaging from '@/lib/models/Packaging';
import { isAdmin, getRole } from '@/lib/authz';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    if (!isAdmin(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;

    const packaging = await Packaging.findByIdAndDelete(id);
    if (!packaging) {
      return NextResponse.json({ success: false, error: 'Packaging not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting packaging type:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete packaging type' }, { status: 500 });
  }
}
