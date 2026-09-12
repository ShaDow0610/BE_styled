import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import Product, { PRODUCT_CATEGORIES } from '@/lib/models/Product';
import { buildPriceIndex, resolvePrice } from '@/lib/priceResolver';
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

export async function generateReference(categorie: string): Promise<string> {
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

    const priceIndex = await buildPriceIndex(productIds);

    const data = products.map((p) => ({
      ...p,
      prix_actuel: resolvePrice(priceIndex, p._id.toString()),
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
    const categorie = PRODUCT_CATEGORIES.includes(body.categorie) ? body.categorie : 'autre';
    const reference = await generateReference(categorie);

    const product = await Product.create({ ...body, reference });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ success: false, error: 'Failed to create product' }, { status: 500 });
  }
}
