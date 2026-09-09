import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import ProductVariant from '@/lib/models/ProductVariant';
import ProductPricing from '@/lib/models/ProductPricing';

export async function GET() {
  try {
    await dbConnect();

    const [
      latestPricingByProduct,
      stockByProduct,
      lowStockVariants,
      produitsEnTransit,
      totalProduits,
    ] = await Promise.all([
      ProductPricing.aggregate([
        { $sort: { date_effet: -1 } },
        {
          $group: {
            _id: '$product_id',
            prix_revente_final: { $first: '$prix_revente_final' },
            marge_pourcentage: { $first: '$marge_pourcentage' },
          },
        },
      ]),
      ProductVariant.aggregate([
        { $group: { _id: '$product_id', stock_total: { $sum: '$stock_quantite' } } },
      ]),
      ProductVariant.aggregate([
        { $match: { $expr: { $lte: ['$stock_quantite', '$seuil_alerte'] } } },
        {
          $lookup: {
            from: 'products',
            localField: 'product_id',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: '$product' },
        {
          $project: {
            sku_variante: 1,
            taille: 1,
            couleur: 1,
            stock_quantite: 1,
            seuil_alerte: 1,
            'product.nom': 1,
          },
        },
        { $limit: 20 },
      ]),
      Product.find({ statut: 'en_transit' }).select('nom reference categorie').limit(20).lean(),
      Product.countDocuments(),
    ]);

    const priceMap = new Map(latestPricingByProduct.map((p) => [p._id.toString(), p]));

    // Valeur totale du stock = somme(quantité × prix de revente actuel).
    let valeurTotaleStock = 0;
    for (const s of stockByProduct) {
      const pricing = priceMap.get(s._id.toString());
      if (pricing) valeurTotaleStock += s.stock_total * pricing.prix_revente_final;
    }

    // Marge moyenne par catégorie : jointure produits <-> dernier prix.
    const products = await Product.find().select('categorie').lean();
    const margeParCategorie = new Map<string, { total: number; count: number }>();
    for (const p of products) {
      const pricing = priceMap.get(p._id.toString());
      if (!pricing) continue;
      const bucket = margeParCategorie.get(p.categorie) || { total: 0, count: 0 };
      bucket.total += pricing.marge_pourcentage;
      bucket.count += 1;
      margeParCategorie.set(p.categorie, bucket);
    }
    const margeMoyenneParCategorie = Array.from(margeParCategorie.entries()).map(
      ([categorie, { total, count }]) => ({
        categorie,
        marge_moyenne: Math.round((total / count) * 100) / 100,
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        totalProduits,
        valeurTotaleStock: Math.round(valeurTotaleStock * 100) / 100,
        margeMoyenneParCategorie,
        alertesRupture: lowStockVariants,
        produitsEnTransit,
      },
    });
  } catch (error) {
    console.error('Error computing dashboard stats:', error);
    return NextResponse.json({ success: false, error: 'Failed to compute dashboard stats' }, { status: 500 });
  }
}
