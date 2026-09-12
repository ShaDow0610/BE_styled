import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import ProductPricing from '@/lib/models/ProductPricing';
import { canWrite, getRole } from '@/lib/authz';
import { generateReference } from '../../route';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;

    const source = await Product.findById(id).lean();
    if (!source) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const reference = await generateReference(source.categorie);

    const duplicate = await Product.create({
      nom: source.nom,
      categorie: source.categorie,
      origine: source.origine,
      description: source.description,
      marque_partenaire_id: source.marque_partenaire_id || null,
      fournisseur_id: source.fournisseur_id || null,
      matiere: source.matiere || '',
      poids_kg: source.poids_kg,
      statut: source.statut,
      couleurs_disponibles: source.couleurs_disponibles || [],
      tailles_disponibles: source.tailles_disponibles || [],
      reference,
    });

    // Reprend la dernière tarification du produit source comme point de
    // départ — le nouveau produit est immédiatement vendable, l'utilisateur
    // n'ajuste que ce qui diffère (prix, tissu…) plutôt que de tout ressaisir.
    const lastPricing = await ProductPricing.findOne({ product_id: id }).sort({ date_effet: -1 }).lean();
    if (lastPricing) {
      await ProductPricing.create({
        product_id: duplicate._id,
        date_effet: new Date(),
        cout_achat: lastPricing.cout_achat,
        devise_achat: lastPricing.devise_achat,
        taux_change_applique: lastPricing.taux_change_applique,
        cout_transport: lastPricing.cout_transport,
        mode_transport: lastPricing.mode_transport,
        delai_estime_jours: lastPricing.delai_estime_jours,
        cout_douane: lastPricing.cout_douane,
        cout_packaging: lastPricing.cout_packaging,
        cout_main_oeuvre: lastPricing.cout_main_oeuvre,
        marge_pourcentage: lastPricing.marge_pourcentage,
        prix_revient_total: lastPricing.prix_revient_total,
        prix_revente_final: lastPricing.prix_revente_final,
        raison_changement: `Dupliqué depuis ${source.reference}`,
      });
    }

    return NextResponse.json({ success: true, data: duplicate }, { status: 201 });
  } catch (error) {
    console.error('Error duplicating product:', error);
    return NextResponse.json({ success: false, error: 'Failed to duplicate product' }, { status: 500 });
  }
}
