import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/connection";
import Product from "@/lib/models/Product";
import ProductImage from "@/lib/models/ProductImage";
import Look from "@/lib/models/Look";
import LookItem from "@/lib/models/LookItem";
import OrderTracking from "@/lib/models/OrderTracking";
import { buildPriceIndex, resolvePrice } from "@/lib/priceResolver";

export interface PublicProduct {
  _id: string;
  nom: string;
  reference: string;
  categorie: string;
  description: string;
  matiere: string;
  prix: number | null;
  image: string | null;
  couleurs_disponibles: string[];
  tailles_disponibles: string[];
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
 * a au moins une couleur ou une taille renseignée (sinon rien n'est
 * réellement proposable à l'achat).
 */
export async function getPublicProducts(filters: Filters = {}): Promise<PublicProduct[]> {
  await dbConnect();

  const query: Record<string, unknown> = { statut: "disponible" };
  if (filters.categorie) query.categorie = filters.categorie;
  if (filters.q) query.nom = { $regex: escapeRegExp(filters.q), $options: "i" };
  if (filters.couleur) query.couleurs_disponibles = filters.couleur;
  if (filters.taille) query.tailles_disponibles = filters.taille;

  const products = await Product.find(query)
    .sort({ date_creation: -1 })
    .limit(filters.limit ?? 100)
    .lean();

  const productIds = products.map((p) => p._id);

  const [priceIndex, images] = await Promise.all([
    buildPriceIndex(productIds),
    ProductImage.find({ product_id: { $in: productIds } }).sort({ ordre_affichage: 1 }).lean(),
  ]);

  const imageByProduct = new Map<string, string>();
  for (const img of images) {
    const key = img.product_id.toString();
    if (!imageByProduct.has(key)) imageByProduct.set(key, img.url);
  }

  return products
    .map((p) => {
      const id = p._id.toString();
      return {
        _id: id,
        nom: p.nom,
        reference: p.reference,
        categorie: p.categorie,
        description: p.description,
        matiere: p.matiere || "",
        prix: resolvePrice(priceIndex, id),
        image: imageByProduct.get(id) ?? null,
        couleurs_disponibles: p.couleurs_disponibles || [],
        tailles_disponibles: p.tailles_disponibles || [],
      };
    })
    .filter((p) => p.couleurs_disponibles.length > 0 || p.tailles_disponibles.length > 0);
}

export interface PublicProductDetail extends PublicProduct {
  images: string[];
}

export async function getPublicProduct(id: string): Promise<PublicProductDetail | null> {
  if (!mongoose.isValidObjectId(id)) return null;

  await dbConnect();

  const product = await Product.findOne({ _id: id, statut: "disponible" }).lean();
  if (!product) return null;

  const couleurs_disponibles = product.couleurs_disponibles || [];
  const tailles_disponibles = product.tailles_disponibles || [];
  if (couleurs_disponibles.length === 0 && tailles_disponibles.length === 0) return null;

  const [priceIndex, images] = await Promise.all([
    buildPriceIndex([product._id]),
    ProductImage.find({ product_id: id }).sort({ ordre_affichage: 1 }).lean(),
  ]);

  const prix = resolvePrice(priceIndex, id);

  return {
    _id: product._id.toString(),
    nom: product.nom,
    reference: product.reference,
    categorie: product.categorie,
    description: product.description,
    matiere: product.matiere || "",
    prix,
    image: images[0]?.url ?? null,
    images: images.map((img) => img.url),
    couleurs_disponibles,
    tailles_disponibles,
  };
}

/**
 * Meilleures ventes pour la vitrine publique : classées par quantité
 * vendue uniquement (jamais par CA/montant — donnée financière interne,
 * cf. canSeeFinancials côté back-office). Ne remonte que des produits
 * toujours visibles sur la vitrine (disponible + couleur/taille renseignée).
 */
export async function getPublicBestSellers(limit = 8): Promise<PublicProduct[]> {
  await dbConnect();

  const ranking = await OrderTracking.aggregate([
    { $match: { type: "commande_client" } },
    { $group: { _id: "$product_id", quantite: { $sum: "$quantite" } } },
    { $sort: { quantite: -1 } },
    { $limit: limit * 3 },
  ]);

  if (ranking.length === 0) return [];

  const orderedIds = ranking.map((r) => r._id).filter(Boolean);

  const products = await Product.find({
    _id: { $in: orderedIds },
    statut: "disponible",
  }).lean();

  const productIds = products.map((p) => p._id);

  const [priceIndex, images] = await Promise.all([
    buildPriceIndex(productIds),
    ProductImage.find({ product_id: { $in: productIds } }).sort({ ordre_affichage: 1 }).lean(),
  ]);

  const imageByProduct = new Map<string, string>();
  for (const img of images) {
    const key = img.product_id.toString();
    if (!imageByProduct.has(key)) imageByProduct.set(key, img.url);
  }

  const byId = new Map(products.map((p) => [p._id.toString(), p]));

  const result: PublicProduct[] = [];
  for (const rankedId of orderedIds) {
    const p = byId.get(rankedId.toString());
    if (!p) continue;
    const id = p._id.toString();
    const couleurs_disponibles = p.couleurs_disponibles || [];
    const tailles_disponibles = p.tailles_disponibles || [];
    if (couleurs_disponibles.length === 0 && tailles_disponibles.length === 0) continue;

    result.push({
      _id: id,
      nom: p.nom,
      reference: p.reference,
      categorie: p.categorie,
      description: p.description,
      matiere: p.matiere || "",
      prix: resolvePrice(priceIndex, id),
      image: imageByProduct.get(id) ?? null,
      couleurs_disponibles,
      tailles_disponibles,
    });
    if (result.length >= limit) break;
  }

  return result;
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
    product_id: string;
    nom: string;
    categorie: string;
    prix: number | null;
    image: string | null;
  }[];
}

export async function getPublicLook(id: string): Promise<PublicLookDetail | null> {
  if (!mongoose.isValidObjectId(id)) return null;

  await dbConnect();

  const look = await Look.findOne({ _id: id, statut: 'actif' }).lean();
  if (!look) return null;

  const lookItems = await LookItem.find({ look_id: id })
    .populate({ path: "product_id", select: "nom categorie" })
    .lean();

  if (lookItems.length === 0) return null;

  const productIds = (lookItems as any[]).map((i) => i.product_id?._id).filter(Boolean);

  const [priceIndex, images] = await Promise.all([
    buildPriceIndex(productIds),
    ProductImage.find({ product_id: { $in: productIds } }).sort({ ordre_affichage: 1 }).lean(),
  ]);

  const imageByProduct = new Map<string, string>();
  for (const img of images) {
    const key = img.product_id.toString();
    if (!imageByProduct.has(key)) imageByProduct.set(key, img.url);
  }

  const items = (lookItems as any[])
    .filter((i) => i.product_id)
    .map((i) => ({
      _id: i._id.toString(),
      product_id: i.product_id._id.toString(),
      nom: i.product_id.nom ?? "Produit supprimé",
      categorie: i.product_id.categorie ?? "",
      prix: resolvePrice(priceIndex, i.product_id._id.toString()),
      image: imageByProduct.get(i.product_id._id.toString()) ?? null,
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

  const looks = await Look.find({ statut: 'actif' }).sort({ _id: -1 }).limit(limit).lean();
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
