import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/connection";
import Product from "@/lib/models/Product";
import ProductVariant from "@/lib/models/ProductVariant";
import ProductImage from "@/lib/models/ProductImage";
import Look from "@/lib/models/Look";
import LookItem from "@/lib/models/LookItem";
import { buildPriceIndex, resolvePrice, resolveMinPrice } from "@/lib/priceResolver";

export interface PublicProduct {
  _id: string;
  nom: string;
  reference: string;
  categorie: string;
  description: string;
  matiere: string;
  prix: number | null;
  prix_a_partir_de: number | null;
  image: string | null;
  variants: {
    _id: string;
    taille: string;
    couleur: string;
    modele?: string;
    stock_quantite: number;
    sku_variante: string;
    prix: number | null;
  }[];
}

interface Filters {
  categorie?: string;
  couleur?: string;
  taille?: string;
  q?: string;
  limit?: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  if (filters.q) query.nom = { $regex: escapeRegExp(filters.q), $options: "i" };

  const products = await Product.find(query)
    .sort({ date_creation: -1 })
    .limit(filters.limit ?? 100)
    .lean();

  const productIds = products.map((p) => p._id);

  const variantQuery: Record<string, unknown> = { product_id: { $in: productIds } };
  if (filters.couleur) variantQuery.couleur = filters.couleur;
  if (filters.taille) variantQuery.taille = filters.taille;

  const [variants, priceIndex, images] = await Promise.all([
    ProductVariant.find(variantQuery).lean(),
    buildPriceIndex(productIds),
    ProductImage.find({ product_id: { $in: productIds } }).sort({ ordre_affichage: 1 }).lean(),
  ]);

  const variantsByProduct = new Map<string, typeof variants>();
  for (const v of variants) {
    const key = v.product_id.toString();
    if (!variantsByProduct.has(key)) variantsByProduct.set(key, []);
    variantsByProduct.get(key)!.push(v);
  }

  const imageByProduct = new Map<string, string>();
  for (const img of images) {
    const key = img.product_id.toString();
    if (!imageByProduct.has(key)) imageByProduct.set(key, img.url);
  }

  return products
    .map((p) => {
      const id = p._id.toString();
      const productVariants = variantsByProduct.get(id) ?? [];
      const prixDefaut = resolvePrice(priceIndex, id);
      return {
        _id: id,
        nom: p.nom,
        reference: p.reference,
        categorie: p.categorie,
        description: p.description,
        matiere: p.matiere || "",
        prix: prixDefaut,
        prix_a_partir_de: prixDefaut == null ? resolveMinPrice(priceIndex, id) : null,
        image: imageByProduct.get(id) ?? null,
        variants: productVariants.map((v) => ({
          _id: v._id.toString(),
          taille: v.taille,
          couleur: v.couleur,
          modele: v.modele,
          stock_quantite: v.stock_quantite,
          sku_variante: v.sku_variante,
          prix: resolvePrice(priceIndex, id, v.modele),
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

  const [variants, priceIndex, images] = await Promise.all([
    ProductVariant.find({ product_id: id }).lean(),
    buildPriceIndex([product._id]),
    ProductImage.find({ product_id: id }).sort({ ordre_affichage: 1 }).lean(),
  ]);

  if (!variants.some((v) => v.stock_quantite > 0)) return null;

  const prixDefaut = resolvePrice(priceIndex, id);

  return {
    _id: product._id.toString(),
    nom: product.nom,
    reference: product.reference,
    categorie: product.categorie,
    description: product.description,
    matiere: product.matiere || "",
    prix: prixDefaut,
    prix_a_partir_de: prixDefaut == null ? resolveMinPrice(priceIndex, id) : null,
    image: images[0]?.url ?? null,
    images: images.map((img) => img.url),
    variants: variants.map((v) => ({
      _id: v._id.toString(),
      taille: v.taille,
      couleur: v.couleur,
      modele: v.modele,
      stock_quantite: v.stock_quantite,
      sku_variante: v.sku_variante,
      prix: resolvePrice(priceIndex, id, v.modele),
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

export interface PublicLookDetail extends PublicLook {
  items: {
    _id: string;
    nom: string;
    taille: string;
    couleur: string;
    modele?: string;
    prix: number | null;
  }[];
}

export async function getPublicLook(id: string): Promise<PublicLookDetail | null> {
  if (!mongoose.isValidObjectId(id)) return null;

  await dbConnect();

  const look = await Look.findById(id).lean();
  if (!look) return null;

  const lookItems = await LookItem.find({ look_id: id })
    .populate({
      path: "product_variant_id",
      select: "taille couleur modele product_id",
      populate: { path: "product_id", select: "nom" },
    })
    .lean();

  if (lookItems.length === 0) return null;

  const productIds = (lookItems as any[])
    .map((i) => i.product_variant_id?.product_id?._id)
    .filter(Boolean);
  const priceIndex = await buildPriceIndex(productIds);

  const items = (lookItems as any[])
    .filter((i) => i.product_variant_id)
    .map((i) => ({
      _id: i._id.toString(),
      nom: i.product_variant_id.product_id?.nom ?? "Produit supprimé",
      taille: i.product_variant_id.taille,
      couleur: i.product_variant_id.couleur,
      modele: i.product_variant_id.modele,
      prix: resolvePrice(priceIndex, i.product_variant_id.product_id._id.toString(), i.product_variant_id.modele),
    }));

  return {
    _id: look._id.toString(),
    nom: look.nom,
    prix_pack: look.prix_pack,
    photo_couverture: look.photo_couverture || "",
    item_count: items.length,
    items,
  };
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
