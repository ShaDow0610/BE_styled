import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import OrderTracking from '@/lib/models/OrderTracking';
import Payment from '@/lib/models/Payment';
import ProductPricing from '@/lib/models/ProductPricing';
import { canWrite, getRole } from '@/lib/authz';

export async function GET() {
  try {
    await dbConnect();
    const orders = await OrderTracking.find()
      .sort({ date_maj: -1 })
      .populate({
        path: 'product_variant_id',
        select: 'taille couleur sku_variante product_id',
        populate: { path: 'product_id', select: 'nom' },
      })
      .lean();

    const clientOrderIds = orders
      .filter((o) => o.type === 'commande_client')
      .map((o) => o._id);

    const [paymentsByOrder, latestPricingByProduct] = await Promise.all([
      Payment.aggregate([
        { $match: { order_tracking_id: { $in: clientOrderIds } } },
        { $group: { _id: '$order_tracking_id', total: { $sum: '$montant' } } },
      ]),
      ProductPricing.aggregate([
        { $sort: { date_effet: -1 } },
        { $group: { _id: '$product_id', prix_revente_final: { $first: '$prix_revente_final' } } },
      ]),
    ]);

    const paymentsMap = new Map(paymentsByOrder.map((p) => [p._id.toString(), p.total]));
    const priceMap = new Map(latestPricingByProduct.map((p) => [p._id.toString(), p.prix_revente_final]));

    const data = orders.map((o) => {
      if (o.type !== 'commande_client') return o;

      const productId = (o.product_variant_id as any)?.product_id?._id?.toString();
      const prix = productId ? priceMap.get(productId) : undefined;
      const montant_total = prix != null ? Math.round(prix * o.quantite * 100) / 100 : null;
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

    const order = await OrderTracking.create({
      product_variant_id: body.product_variant_id,
      type: body.type,
      statut: 'commande',
      quantite: Math.max(1, Number(body.quantite) || 1),
      date_maj: new Date(),
    });
    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error) {
    console.error('Error creating order tracking entry:', error);
    return NextResponse.json({ success: false, error: 'Failed to create order tracking entry' }, { status: 500 });
  }
}
