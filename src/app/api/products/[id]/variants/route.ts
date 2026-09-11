import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import ProductVariant from '@/lib/models/ProductVariant';
import { canWrite, getRole } from '@/lib/authz';
import { buildPriceIndex, resolvePrice } from '@/lib/priceResolver';

type Params = { params: Promise<{ id: string }> };

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accents (diacritiques combinants apres normalize NFD)
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toUpperCase();
}

async function generateSku(reference: string, modele: string | undefined, taille: string, couleur: string): Promise<string> {
  const parts = [reference, modele ? normalize(modele) : null, normalize(taille), normalize(couleur)].filter(Boolean);
  const base = parts.join('-');

  let sku = base;
  for (let i = 0; i < 20; i++) {
    const exists = await ProductVariant.exists({ sku_variante: sku });
    if (!exists) return sku;
    sku = `${base}-${i + 2}`;
  }
  // Filet de sécurité très improbable : suffixe temporel pour garantir l'unicité.
  return `${base}-${Date.now()}`;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { id } = await params;
    const variants = await ProductVariant.find({ product_id: id }).lean();
    const priceIndex = await buildPriceIndex([new mongoose.Types.ObjectId(id)]);
    const data = variants.map((v) => ({ ...v, prix: resolvePrice(priceIndex, id, v.modele) }));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching variants:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch variants' }, { status: 500 });
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

    const product = await Product.findById(id).select('reference');
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const sku_variante = await generateSku(product.reference, body.modele, body.taille, body.couleur);
    const variant = await ProductVariant.create({ ...body, product_id: id, sku_variante });
    return NextResponse.json({ success: true, data: variant }, { status: 201 });
  } catch (error) {
    console.error('Error creating variant:', error);
    return NextResponse.json({ success: false, error: 'Failed to create variant' }, { status: 500 });
  }
}
