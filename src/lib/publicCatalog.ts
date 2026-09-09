import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/connection";
import Product from "@/lib/models/Product";
import ProductVariant from "@/lib/models/ProductVariant";
import ProductPricing from "@/lib/models/ProductPricing";
import ProductImage from "@/lib/models/ProductImage";
import Look from "@/lib/models/Look";
import LookItem from "@/lib/models/LookItem";

export interface PublicProduct {
  _id: string;
  nom: string;
  reference: string;
  categorie: string;
  description: string;
  prix: number | null;
  image: string | null;
  variants: {
    _id: string;
    taille: string;
    couleur: string;
    stock_quantite: number;
    sku_variante: string;
  }[];
}

interface Filters {
  categorie?: string;
  couleur?: string;
  taille?: string;
  limit?: number;
}

/**
 * Un produit est visible sur la vitrine s'il est en statut "disponible" ET
 * a au moins une variante en stock (cahier des charges §4 : le statut
 * logistique/de vente et la disponibilité réelle en stock sont deux choses
 * différentes — un produit "disponible" peut avoir toutes ses variantes
 * épuisées, auquel cas il ne doit pas apparaître sur la vitrine).
 */
export async function getPublicProducts(filters: Filters = {}): Promise<PublicProduct[]> {
  await dbConnect();

  const query: Record<string, unknown> = { statut: "disponible" };
  if (filters.categorie) query.categorie = filters.categorie;

  const products = await Product.find(query)
    .sort({ date_creation: -1 })
    .limit(filters.limit ?? 100)
    .lean();

  const productIds = products.map((p) => p._id);

  const variantQuery: Record<string, unknown> = { product_id: { $in: productIds } };
  if (filters.couleur) variantQuery.couleur = filters.couleur;
  if (filters.taille) variantQuery.taille = filters.taille;

  const [variants, pricing, images] = await Promise.all([
    ProductVariant.find(variantQuery).lean(),
    ProductPricing.aggregate([
      { $match: { product_id: { $in: productIds } } },
      { $sort: { date_effet: -1 } },
      { $group: { _id: "$product_id", prix_revente_final: { $first: "$prix_revente_final" } } },
    ]),
    ProductImage.find({ product_id: { $in: productIds } }).sort({ ordre_affichage: 1 }).lean(),
  ]);

  const variantsByProduct = new Map<string, typeof variants>();
  for (const v of variants) {
    const key = v.product_id.toString();
    if (!variantsByProduct.has(key)) variantsByProduct.set(key, []);
    variantsByProduct.get(key)!.push(v);
  }

  const priceMap = new Map(pricing.map((p) => [p._id.toString(), p.prix_revente_final]));

  const imageByProduct = new Map<string, string>();
  for (const img of images) {
    const key = img.product_id.toString();
    if (!imageByProduct.has(key)) imageByProduct.set(key, img.url);
  }

  return products
    .map((p) => {
      const productVariants = variantsByProduct.get(p._id.toString()) ?? [];
      return {
        _id: p._id.toString(),
        nom: p.nom,
        reference: p.reference,
        categorie: p.categorie,
        description: p.description,
        prix: priceMap.get(p._id.toString()) ?? null,
        image: imageByProduct.get(p._id.toString()) ?? null,
        variants: productVariants.map((v) => ({
          _id: v._id.toString(),
          taille: v.taille,
          couleur: v.couleur,
          stock_quantite: v.stock_quantite,
          sku_variante: v.sku_variante,
        })),
      };
    })
    .filter((p) => p.variants.some((v) => v.stock_quantite > 0));
}

export interface PublicProductDetail extends PublicProduct {
  images: string[];
}

export async function getPublicProduct(id: string): Promise<PublicProductDetail | null> {
  if (!mongoose.isValidObjectId(id)) return null;

  await dbConnect();

  const product = await Product.findOne({ _id: id, statut: "disponible" }).lean();
  if (!product) return null;

  const [variants, pricingHistory, images] = await Promise.all([
    ProductVariant.find({ product_id: id }).lean(),
    ProductPricing.find({ product_id: id }).sort({ date_effet: -1 }).limit(1).lean(),
    ProductImage.find({ product_id: id }).sort({ ordre_affichage: 1 }).lean(),
  ]);

  if (!variants.some((v) => v.stock_quantite > 0)) return null;

  return {
    _id: product._id.toString(),
    nom: product.nom,
    reference: product.reference,
    categorie: product.categorie,
    description: product.description,
    prix: pricingHistory[0]?.prix_revente_final ?? null,
    image: images[0]?.url ?? null,
    images: images.map((img) => img.url),
    variants: variants.map((v) => ({
      _id: v._id.toString(),
      taille: v.taille,
      couleur: v.couleur,
      stock_quantite: v.stock_quantite,
      sku_variante: v.sku_variante,
    })),
  };
}

export interface PublicLook {
  _id: string;
  nom: string;
  prix_pack: number;
  photo_couverture: string;
  item_count: number;
}

export async function getPublicLooks(limit = 100): Promise<PublicLook[]> {
  await dbConnect();

  const looks = await Look.find().sort({ _id: -1 }).limit(limit).lean();
  const lookIds = looks.map((l) => l._id);

  const itemCounts = await LookItem.aggregate([
    { $match: { look_id: { $in: lookIds } } },
    { $group: { _id: "$look_id", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(itemCounts.map((c) => [c._id.toString(), c.count]));

  return looks
    .map((l) => ({
      _id: l._id.toString(),
      nom: l.nom,
      prix_pack: l.prix_pack,
      photo_couverture: l.photo_couverture || "",
      item_count: countMap.get(l._id.toString()) ?? 0,
    }))
    .filter((l) => l.item_count > 0);
}
