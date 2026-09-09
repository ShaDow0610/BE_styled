import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import ProductVariant from '@/lib/models/ProductVariant';
import ProductPricing from '@/lib/models/ProductPricing';
import { canWrite, getRole } from '@/lib/authz';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const origine = searchParams.get('origine');
    const categorie = searchParams.get('categorie');
    const statut = searchParams.get('statut');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (origine) query.origine = origine;
    if (categorie) query.categorie = categorie;
    if (statut) query.statut = statut;

    const products = await Product.find(query)
      .sort({ date_creation: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments(query);
    const productIds = products.map((p) => p._id);

    // Stock total et dernier prix agrégés en 2 requêtes (pas de N+1 par produit).
    const [stockByProduct, latestPricing] = await Promise.all([
      ProductVariant.aggregate([
        { $match: { product_id: { $in: productIds } } },
        { $group: { _id: '$product_id', stock_total: { $sum: '$stock_quantite' } } },
      ]),
      ProductPricing.aggregate([
        { $match: { product_id: { $in: productIds } } },
        { $sort: { date_effet: -1 } },
        {
          $group: {
            _id: '$product_id',
            prix_revente_final: { $first: '$prix_revente_final' },
          },
        },
      ]),
    ]);

    const stockMap = new Map(stockByProduct.map((s) => [s._id.toString(), s.stock_total]));
    const priceMap = new Map(latestPricing.map((p) => [p._id.toString(), p.prix_revente_final]));

    const data = products.map((p) => ({
      ...p,
      stock_total: stockMap.get(p._id.toString()) ?? 0,
      prix_actuel: priceMap.get(p._id.toString()) ?? null,
    }));

    return NextResponse.json({
      success: true,
      data,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const product = await Product.create(body);

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ success: false, error: 'Failed to create product' }, { status: 500 });
  }
}

