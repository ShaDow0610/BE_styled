import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import PackagingPurchase from '@/lib/models/PackagingPurchase';
import { canWrite, getRole } from '@/lib/authz';

export async function GET() {
  try {
    await dbConnect();
    const purchases = await PackagingPurchase.find().sort({ date_achat: -1 }).lean();
    return NextResponse.json({ success: true, data: purchases });
  } catch (error) {
    console.error('Error fetching packaging purchases:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch packaging purchases' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const body = await request.json();
    const nom = String(body.nom || '').trim();
    const quantite = Number(body.quantite);
    const prix_unitaire = Number(body.prix_unitaire);

    if (!nom || !quantite || quantite <= 0 || !prix_unitaire || prix_unitaire < 0) {
      return NextResponse.json({ success: false, error: 'nom, quantite et prix_unitaire requis' }, { status: 400 });
    }

    const purchase = await PackagingPurchase.create({
      nom,
      packaging_id: body.packaging_id || undefined,
      quantite,
      prix_unitaire,
      montant_total: Math.round(quantite * prix_unitaire * 100) / 100,
      fournisseur: body.fournisseur || '',
      date_achat: body.date_achat ? new Date(body.date_achat) : new Date(),
      notes: body.notes || '',
    });

    return NextResponse.json({ success: true, data: purchase }, { status: 201 });
  } catch (error) {
    console.error('Error creating packaging purchase:', error);
    return NextResponse.json({ success: false, error: 'Failed to create packaging purchase' }, { status: 500 });
  }
}
