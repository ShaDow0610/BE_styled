import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import Packaging from '@/lib/models/Packaging';
import { isAdmin, canWrite, getRole } from '@/lib/authz';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const update: Record<string, unknown> = {};
    if (typeof body.nom === 'string' && body.nom.trim()) update.nom = body.nom.trim();
    if (body.prix_unitaire != null) {
      const prix = Number(body.prix_unitaire);
      if (!prix || prix < 0) {
        return NextResponse.json({ success: false, error: 'Prix invalide' }, { status: 400 });
      }
      update.prix_unitaire = prix;
    }
    if (typeof body.actif === 'boolean') update.actif = body.actif;

    const packaging = await Packaging.findByIdAndUpdate(id, update, { new: true });
    if (!packaging) {
      return NextResponse.json({ success: false, error: 'Packaging not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: packaging });
  } catch (error) {
    console.error('Error updating packaging type:', error);
    return NextResponse.json({ success: false, error: 'Failed to update packaging type' }, { status: 500 });
  }
}

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
