import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import ProductPricing from '@/lib/models/ProductPricing';
import { calculatePricing, calculatePricingFromSellingPrice } from '@/lib/pricing';
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
      prix_revente_final: prixVenteSaisi,
      raison_changement,
    } = body;

    const costs = {
      cout_achat,
      taux_change_applique,
      cout_transport: cout_transport || 0,
      cout_douane: cout_douane || 0,
      cout_packaging: cout_packaging || 0,
      cout_main_oeuvre: cout_main_oeuvre || 0,
    };

    // Le calcul est toujours refait côté serveur — toute valeur pré-calculée
    // envoyée par le client est ignorée (cahier des charges §4). Deux sens
    // possibles : on fournit la marge (calcul classique) ou directement le
    // prix de vente souhaité (la marge est alors déduite).
    const { prix_revient_total, prix_revente_final, marge_pourcentage: margeCalculee } =
      prixVenteSaisi != null
        ? calculatePricingFromSellingPrice(costs, Number(prixVenteSaisi))
        : calculatePricing({ ...costs, marge_pourcentage: Number(marge_pourcentage) });

    const pricing = await ProductPricing.create({
      product_id: id,
      date_effet: new Date(),
      cout_achat,
      devise_achat,
      taux_change_applique,
      cout_transport: costs.cout_transport,
      mode_transport,
      delai_estime_jours,
      cout_douane: costs.cout_douane,
      cout_packaging: costs.cout_packaging,
      cout_main_oeuvre: costs.cout_main_oeuvre,
      marge_pourcentage: margeCalculee,
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
