import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import Invoice from '@/lib/models/Invoice';
import OrderTracking from '@/lib/models/OrderTracking';
import { canWrite, getRole } from '@/lib/authz';

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  let attempt = (await Invoice.countDocuments({ numero_facture: new RegExp(`^FACT-${year}-`) })) + 1;

  for (let i = 0; i < 20; i++) {
    const numero = `FACT-${year}-${String(attempt).padStart(3, '0')}`;
    const exists = await Invoice.exists({ numero_facture: numero });
    if (!exists) return numero;
    attempt += 1;
  }
  // Filet de sécurité très improbable : suffixe temporel pour garantir l'unicité.
  return `FACT-${year}-${Date.now()}`;
}

export async function GET(request: NextRequest) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const invoices = await Invoice.find()
      .select('numero_facture client_nom montant_total date_facture date_creation')
      .sort({ date_creation: -1 })
      .lean();

    return NextResponse.json({ success: true, data: invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const body = await request.json();
    const orderTrackingIds: string[] = Array.isArray(body.order_tracking_ids) ? body.order_tracking_ids : [];
    const clientNom = String(body.client_nom || '').trim();

    if (!clientNom) {
      return NextResponse.json({ success: false, error: 'Le nom du client est requis' }, { status: 400 });
    }
    if (orderTrackingIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Aucune commande sélectionnée' }, { status: 400 });
    }

    const orders = await OrderTracking.find({ _id: { $in: orderTrackingIds } })
      .populate({ path: 'product_id', select: 'nom' })
      .lean();

    if (orders.length !== orderTrackingIds.length) {
      return NextResponse.json({ success: false, error: 'Une ou plusieurs commandes sont introuvables' }, { status: 400 });
    }

    for (const o of orders as any[]) {
      if (o.type !== 'commande_client') {
        return NextResponse.json(
          { success: false, error: `La ligne "${o.product_id?.nom ?? o._id}" n'est pas une commande client` },
          { status: 400 }
        );
      }
      if (o.facture_id) {
        return NextResponse.json(
          { success: false, error: `La ligne "${o.product_id?.nom ?? o._id}" est déjà facturée` },
          { status: 400 }
        );
      }
      if (o.montant_total == null) {
        return NextResponse.json(
          { success: false, error: `La ligne "${o.product_id?.nom ?? o._id}" n'a pas de prix défini` },
          { status: 400 }
        );
      }
    }

    const lignes = (orders as any[]).map((o) => ({
      order_tracking_id: o._id,
      produit_nom: o.product_id?.nom ?? 'Produit supprimé',
      couleur: o.couleur ?? '',
      taille: o.taille ?? '',
      quantite: o.quantite,
      prix_unitaire: o.prix_unitaire ?? Math.round((o.montant_total / o.quantite) * 100) / 100,
      montant_total: o.montant_total,
    }));
    const montantTotal = Math.round(lignes.reduce((sum, l) => sum + l.montant_total, 0) * 100) / 100;

    const numeroFacture = await generateInvoiceNumber();

    const invoice = await Invoice.create({
      numero_facture: numeroFacture,
      client_nom: clientNom,
      client_telephone: body.client_telephone || '',
      client_adresse: body.client_adresse || '',
      date_facture: body.date_facture ? new Date(body.date_facture) : new Date(),
      lignes,
      order_tracking_ids: orderTrackingIds,
      montant_total: montantTotal,
    });

    await OrderTracking.updateMany(
      { _id: { $in: orderTrackingIds } },
      { $set: { facture_id: invoice._id } }
    );

    return NextResponse.json({ success: true, data: invoice }, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ success: false, error: 'Failed to create invoice' }, { status: 500 });
  }
}
