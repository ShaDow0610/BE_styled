import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import Product, { PRODUCT_CATEGORIES } from '@/lib/models/Product';
import ProductVariant from '@/lib/models/ProductVariant';
import { buildPriceIndex, resolvePrice, resolveMinPrice } from '@/lib/priceResolver';
import { canWrite, getRole } from '@/lib/authz';

const CATEGORY_CODES: Record<string, string> = {
  pantalon: 'PANT',
  chemise: 'CHEM',
  tricot: 'TRIC',
  culotte: 'CULO',
  bracelet: 'BRAC',
  montre: 'MONT',
  chaussure: 'CHAU',
  bague: 'BAGU',
  chapeau: 'CHAP',
  lunette: 'LUNE',
  autre: 'AUTR',
};

async function generateReference(categorie: string): Promise<string> {
  const code = CATEGORY_CODES[categorie] || 'AUTR';
  let attempt = (await Product.countDocuments({ categorie })) + 1;

  for (let i = 0; i < 20; i++) {
    const reference = `BSTY-${code}-${String(attempt).padStart(3, '0')}`;
    const exists = await Product.exists({ reference });
    if (!exists) return reference;
    attempt += 1;
  }
  // Filet de sécurité très improbable : suffixe temporel pour garantir l'unicité.
  return `BSTY-${code}-${Date.now()}`;
}

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

    // Stock total, tailles disponibles et prix agrégés sans N+1 par produit.
    const [stockByProduct, priceIndex] = await Promise.all([
      ProductVariant.aggregate([
        { $match: { product_id: { $in: productIds } } },
        { $group: { _id: '$product_id', stock_total: { $sum: '$stock_quantite' }, tailles: { $addToSet: '$taille' } } },
      ]),
      buildPriceIndex(productIds),
    ]);

    const stockMap = new Map(stockByProduct.map((s) => [s._id.toString(), s.stock_total]));
    const taillesMap = new Map(stockByProduct.map((s) => [s._id.toString(), (s.tailles as string[]).sort()]));

    const data = products.map((p) => {
      const id = p._id.toString();
      const prixDefaut = resolvePrice(priceIndex, id);
      return {
        ...p,
        stock_total: stockMap.get(id) ?? 0,
        tailles: taillesMap.get(id) ?? [],
        prix_actuel: prixDefaut,
        prix_a_partir_de: prixDefaut == null ? resolveMinPrice(priceIndex, id) : null,
      };
    });

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
    const categorie = PRODUCT_CATEGORIES.includes(body.categorie) ? body.categorie : 'autre';
    const reference = await generateReference(categorie);

    const product = await Product.create({ ...body, reference });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ success: false, error: 'Failed to create product' }, { status: 500 });
  }
}
