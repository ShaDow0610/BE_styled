import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import Packaging from '@/lib/models/Packaging';
import { canWrite, getRole } from '@/lib/authz';

export async function GET() {
  try {
    await dbConnect();
    const options = await Packaging.find().sort({ nom: 1 }).lean();
    return NextResponse.json({ success: true, data: options });
  } catch (error) {
    console.error('Error fetching packaging options:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch packaging options' }, { status: 500 });
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
    const prix_unitaire = Number(body.prix_unitaire);

    if (!nom || !prix_unitaire || prix_unitaire <= 0) {
      return NextResponse.json({ success: false, error: 'nom et prix_unitaire requis' }, { status: 400 });
    }

    const packaging = await Packaging.findOneAndUpdate(
      { nom },
      { nom, prix_unitaire },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, data: packaging }, { status: 201 });
  } catch (error) {
    console.error('Error creating packaging option:', error);
    return NextResponse.json({ success: false, error: 'Failed to create packaging option' }, { status: 500 });
  }
}
