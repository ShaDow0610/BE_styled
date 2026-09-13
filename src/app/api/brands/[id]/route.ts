import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import Brand from '@/lib/models/Brand';
import Product from '@/lib/models/Product';
import { canWrite, isAdmin, getRole } from '@/lib/authz';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const brand = await Brand.findByIdAndUpdate(id, body, { new: true });
    if (!brand) {
      return NextResponse.json({ success: false, error: 'Brand not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: brand });
  } catch (error) {
    console.error('Error updating brand:', error);
    return NextResponse.json({ success: false, error: 'Failed to update brand' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    if (!isAdmin(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;

    const inUse = await Product.exists({ marque_partenaire_id: id });
    if (inUse) {
      return NextResponse.json(
        { success: false, error: 'Cette marque est utilisée par au moins un produit — réaffecte-les avant de la supprimer.' },
        { status: 400 }
      );
    }

    const brand = await Brand.findByIdAndDelete(id);
    if (!brand) {
      return NextResponse.json({ success: false, error: 'Brand not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting brand:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete brand' }, { status: 500 });
  }
}
