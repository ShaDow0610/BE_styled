import ProductPricing from '@/lib/models/ProductPricing';
import mongoose from 'mongoose';

export interface PriceIndex {
  defaultByProduct: Map<string, number>;
  byModelKey: Map<string, number>;
  /** Tous les prix (défaut + par modèle) connus pour un produit, pour "à partir de". */
  allByProduct: Map<string, number[]>;
}

const modelKey = (productId: string, modele: string) => `${productId}:${modele}`;

/**
 * Un seul aller-retour Mongo pour résoudre le prix de vente de n'importe
 * quel produit/modèle : dernière entrée ProductPricing par (product_id,
 * modele), avec repli sur le prix par défaut du produit (modele absent)
 * si aucun prix spécifique n'existe pour ce modèle. Centralisé ici pour
 * que cette règle ne soit écrite qu'une fois (dashboard, commandes,
 * vitrine, liste produits en dépendent tous).
 */
export async function buildPriceIndex(
  productIds: (string | mongoose.Types.ObjectId)[]
): Promise<PriceIndex> {
  const rows = await ProductPricing.aggregate([
    { $match: { product_id: { $in: productIds } } },
    { $sort: { date_effet: -1 } },
    {
      $group: {
        _id: { product_id: '$product_id', modele: '$modele' },
        prix_revente_final: { $first: '$prix_revente_final' },
      },
    },
  ]);

  const defaultByProduct = new Map<string, number>();
  const byModelKey = new Map<string, number>();
  const allByProduct = new Map<string, number[]>();

  for (const row of rows) {
    const productId = row._id.product_id.toString();
    const modele: string | null = row._id.modele ?? null;
    const prix = row.prix_revente_final;

    if (!modele) {
      defaultByProduct.set(productId, prix);
    } else {
      byModelKey.set(modelKey(productId, modele), prix);
    }

    if (!allByProduct.has(productId)) allByProduct.set(productId, []);
    allByProduct.get(productId)!.push(prix);
  }

  return { defaultByProduct, byModelKey, allByProduct };
}

/** Prix résolu pour un modèle précis, avec repli sur le prix par défaut du produit. */
export function resolvePrice(
  index: PriceIndex,
  productId: string,
  modele?: string | null
): number | null {
  if (modele) {
    const specific = index.byModelKey.get(modelKey(productId, modele));
    if (specific != null) return specific;
  }
  return index.defaultByProduct.get(productId) ?? null;
}

/** Le plus bas prix connu pour ce produit (défaut ou par modèle) — pour l'affichage "à partir de". */
export function resolveMinPrice(index: PriceIndex, productId: string): number | null {
  const all = index.allByProduct.get(productId);
  if (!all || all.length === 0) return null;
  return Math.min(...all);
}
