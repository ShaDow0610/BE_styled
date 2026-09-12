import ProductPricing from '@/lib/models/ProductPricing';
import mongoose from 'mongoose';

export type PriceIndex = Map<string, number>;

/**
 * Un seul aller-retour Mongo pour résoudre le prix de vente de n'importe
 * quel produit : dernière entrée ProductPricing par product_id. Centralisé
 * ici pour que cette règle ne soit écrite qu'une fois (dashboard,
 * commandes, vitrine, liste produits en dépendent tous).
 */
export async function buildPriceIndex(
  productIds: (string | mongoose.Types.ObjectId)[]
): Promise<PriceIndex> {
  const rows = await ProductPricing.aggregate([
    { $match: { product_id: { $in: productIds } } },
    { $sort: { date_effet: -1 } },
    { $group: { _id: '$product_id', prix_revente_final: { $first: '$prix_revente_final' } } },
  ]);

  const index: PriceIndex = new Map();
  for (const row of rows) {
    index.set(row._id.toString(), row.prix_revente_final);
  }
  return index;
}

export function resolvePrice(index: PriceIndex, productId: string): number | null {
  return index.get(productId) ?? null;
}
