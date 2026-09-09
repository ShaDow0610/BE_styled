import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import ProductPricing from '@/lib/models/ProductPricing';
import { calculatePricing } from '@/lib/pricing';
import { canWrite, getRole } from '@/lib/authz';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { id } = await params;
    const history = await ProductPricing.find({ product_id: id }).sort({ date_effet: -1 }).lean();
    return NextResponse.json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching pricing history:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch pricing history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const {
      cout_achat,
      devise_achat,
      taux_change_applique,
      cout_transport,
      mode_transport,
      delai_estime_jours,
      cout_douane,
      cout_packaging,
      cout_main_oeuvre,
      marge_pourcentage,
      raison_changement,
    } = body;

    // Le calcul est toujours refait côté serveur — toute valeur pré-calculée
    // envoyée par le client est ignorée (cahier des charges §4).
    const { prix_revient_total, prix_revente_final } = calculatePricing({
      cout_achat,
      taux_change_applique,
      cout_transport,
      cout_douane,
      cout_packaging,
      cout_main_oeuvre,
      marge_pourcentage,
    });

    const pricing = await ProductPricing.create({
      product_id: id,
      date_effet: new Date(),
      cout_achat,
      devise_achat,
      taux_change_applique,
      cout_transport,
      mode_transport,
      delai_estime_jours,
      cout_douane,
      cout_packaging,
      cout_main_oeuvre,
      marge_pourcentage,
      prix_revient_total,
      prix_revente_final,
      raison_changement,
    });

    return NextResponse.json({ success: true, data: pricing }, { status: 201 });
  } catch (error) {
    console.error('Error creating pricing entry:', error);
    return NextResponse.json({ success: false, error: 'Failed to create pricing entry' }, { status: 500 });
  }
}
