import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import Supplier from '@/lib/models/Supplier';
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

    const supplier = await Supplier.findByIdAndUpdate(id, body, { new: true });
    if (!supplier) {
      return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: supplier });
  } catch (error) {
    console.error('Error updating supplier:', error);
    return NextResponse.json({ success: false, error: 'Failed to update supplier' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;

    const supplier = await Supplier.findByIdAndDelete(id);
    if (!supplier) {
      return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete supplier' }, { status: 500 });
  }
}
