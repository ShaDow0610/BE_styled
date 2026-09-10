import { NextRequest, NextResponse } from 'next/server';
import { calculatePricing, calculatePricingFromSellingPrice } from '@/lib/pricing';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      cout_achat,
      taux_change_applique,
      cout_transport,
      cout_douane,
      cout_packaging,
      cout_main_oeuvre,
      marge_pourcentage,
      prix_revente_final: prixVenteSaisi,
    } = body;

    if (
      [cout_achat, taux_change_applique].some(
        (v) => v === undefined || v === null || Number.isNaN(Number(v))
      )
    ) {
      return NextResponse.json(
        { success: false, error: 'cout_achat et taux_change_applique sont requis' },
        { status: 400 }
      );
    }

    const costs = {
      cout_achat: Number(cout_achat),
      taux_change_applique: Number(taux_change_applique),
      cout_transport: Number(cout_transport) || 0,
      cout_douane: Number(cout_douane) || 0,
      cout_packaging: Number(cout_packaging) || 0,
      cout_main_oeuvre: Number(cout_main_oeuvre) || 0,
    };

    const result =
      prixVenteSaisi != null && prixVenteSaisi !== ''
        ? calculatePricingFromSellingPrice(costs, Number(prixVenteSaisi))
        : calculatePricing({ ...costs, marge_pourcentage: Number(marge_pourcentage) || 0 });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error previewing pricing:', error);
    return NextResponse.json({ success: false, error: 'Failed to preview pricing' }, { status: 500 });
  }
}
