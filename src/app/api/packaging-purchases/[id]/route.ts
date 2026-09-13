import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import PackagingPurchase from '@/lib/models/PackagingPurchase';
import { isAdmin, canWrite, getRole } from '@/lib/authz';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;
    const purchase = await PackagingPurchase.findById(id).lean();
    if (!purchase) {
      return NextResponse.json({ success: false, error: 'Purchase not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: purchase });
  } catch (error) {
    console.error('Error fetching packaging purchase:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch packaging purchase' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const purchase = await PackagingPurchase.findById(id);
    if (!purchase) {
      return NextResponse.json({ success: false, error: 'Purchase not found' }, { status: 404 });
    }

    if (typeof body.nom === 'string' && body.nom.trim()) purchase.nom = body.nom.trim();
    if (typeof body.fournisseur === 'string') purchase.fournisseur = body.fournisseur.trim();
    if (typeof body.notes === 'string') purchase.notes = body.notes.trim();
    if (body.date_achat) purchase.date_achat = new Date(body.date_achat);
    if (body.quantite != null) {
      const quantite = Number(body.quantite);
      if (!quantite || quantite <= 0) {
        return NextResponse.json({ success: false, error: 'Quantité invalide' }, { status: 400 });
      }
      purchase.quantite = quantite;
    }
    if (body.prix_unitaire != null) {
      const prix = Number(body.prix_unitaire);
      if (prix < 0) {
        return NextResponse.json({ success: false, error: 'Prix invalide' }, { status: 400 });
      }
      purchase.prix_unitaire = prix;
    }
    purchase.montant_total = Math.round(purchase.quantite * purchase.prix_unitaire * 100) / 100;

    await purchase.save();
    return NextResponse.json({ success: true, data: purchase });
  } catch (error) {
    console.error('Error updating packaging purchase:', error);
    return NextResponse.json({ success: false, error: 'Failed to update packaging purchase' }, { status: 500 });
  }
}

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
