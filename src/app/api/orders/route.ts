import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import OrderTracking from '@/lib/models/OrderTracking';
import Payment from '@/lib/models/Payment';
import ProductVariant from '@/lib/models/ProductVariant';
import { buildPriceIndex, resolvePrice } from '@/lib/priceResolver';
import { canWrite, getRole } from '@/lib/authz';

export async function GET() {
  try {
    await dbConnect();
    const orders = await OrderTracking.find()
      .sort({ date_maj: -1 })
      .populate({
        path: 'product_variant_id',
        select: 'taille couleur sku_variante product_id modele',
        populate: { path: 'product_id', select: 'nom' },
      })
      .lean();

    const clientOrders = orders.filter((o) => o.type === 'commande_client');
    const clientOrderIds = clientOrders.map((o) => o._id);

    // Filet de secours pour les commandes créées avant l'ajout du prix figé :
    // on résout leur prix en direct plutôt que de les afficher sans montant.
    const legacyProductIds = clientOrders
      .filter((o) => o.montant_total == null)
      .map((o) => (o.product_variant_id as any)?.product_id?._id)
      .filter(Boolean);

    const [paymentsByOrder, legacyPriceIndex] = await Promise.all([
      Payment.aggregate([
        { $match: { order_tracking_id: { $in: clientOrderIds } } },
        { $group: { _id: '$order_tracking_id', total: { $sum: '$montant' } } },
      ]),
      buildPriceIndex(legacyProductIds),
    ]);

    const paymentsMap = new Map(paymentsByOrder.map((p) => [p._id.toString(), p.total]));

    const data = orders.map((o) => {
      if (o.type !== 'commande_client') return o;

      let montant_total = o.montant_total;
      if (montant_total == null) {
        const variant = o.product_variant_id as any;
        const productId = variant?.product_id?._id?.toString();
        const prix = productId ? resolvePrice(legacyPriceIndex, productId, variant?.modele) : null;
        montant_total = prix != null ? Math.round(prix * o.quantite * 100) / 100 : null;
      }
      const montant_encaisse = Math.round((paymentsMap.get(o._id.toString()) ?? 0) * 100) / 100;

      return { ...o, montant_total, montant_encaisse };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const body = await request.json();
    const quantite = Math.max(1, Number(body.quantite) || 1);

    let prix_unitaire: number | null = null;
    let montant_total: number | null = null;

    if (body.type === 'commande_client') {
      const prixSaisi = Number(body.prix_unitaire);
      if (prixSaisi > 0) {
        // Prix ajusté manuellement au moment de la vente (négociation, prix pas
        // encore défini au catalogue, etc.) — prioritaire sur le prix résolu.
        prix_unitaire = Math.round(prixSaisi * 100) / 100;
        montant_total = Math.round(prix_unitaire * quantite * 100) / 100;
      } else {
        const variant = await ProductVariant.findById(body.product_variant_id).select('product_id modele');
        if (variant) {
          const priceIndex = await buildPriceIndex([variant.product_id]);
          prix_unitaire = resolvePrice(priceIndex, variant.product_id.toString(), variant.modele);
          montant_total = prix_unitaire != null ? Math.round(prix_unitaire * quantite * 100) / 100 : null;
        }
      }
    }

    const order = await OrderTracking.create({
      product_variant_id: body.product_variant_id,
      type: body.type,
      statut: 'commande',
      quantite,
      prix_unitaire,
      montant_total,
      date_maj: new Date(),
    });
    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error) {
    console.error('Error creating order tracking entry:', error);
    return NextResponse.json({ success: false, error: 'Failed to create order tracking entry' }, { status: 500 });
  }
}
