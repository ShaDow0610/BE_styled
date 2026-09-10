import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import ProductVariant from '@/lib/models/ProductVariant';
import ProductPricing from '@/lib/models/ProductPricing';
import Supplier from '@/lib/models/Supplier';
import OrderTracking from '@/lib/models/OrderTracking';
import ProductImage from '@/lib/models/ProductImage';
import Payment from '@/lib/models/Payment';

export async function GET() {
  try {
    await dbConnect();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [
      latestPricingByProduct,
      stockByProduct,
      lowStockVariants,
      produitsEnTransit,
      totalProduits,
      allProducts,
      suppliers,
      recentSales,
      imagesCountByProduct,
      stuckOrders,
      allClientOrders,
      paymentsByOrder,
      encaissements30jAgg,
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
            product_id: 1,
            'product.nom': 1,
          },
        },
        { $limit: 20 },
      ]),
      Product.find({ statut: 'en_transit' }).select('nom reference categorie').limit(20).lean(),
      Product.countDocuments(),
      Product.find().select('nom categorie statut origine fournisseur_id').lean(),
      Supplier.find().select('nom').lean(),
      OrderTracking.find({ type: 'commande_client', statut: 'livre_client', date_maj: { $gte: thirtyDaysAgo } })
        .populate({ path: 'product_variant_id', select: 'product_id', populate: { path: 'product_id', select: 'nom' } })
        .lean(),
      ProductImage.aggregate([{ $group: { _id: '$product_id', count: { $sum: 1 } } }]),
      OrderTracking.find({ stock_applique: false, date_maj: { $lt: fourteenDaysAgo } })
        .populate({ path: 'product_variant_id', select: 'sku_variante product_id', populate: { path: 'product_id', select: 'nom' } })
        .limit(20)
        .lean(),
      OrderTracking.find({ type: 'commande_client' })
        .select('quantite product_variant_id')
        .populate({ path: 'product_variant_id', select: 'product_id' })
        .lean(),
      Payment.aggregate([{ $group: { _id: '$order_tracking_id', total: { $sum: '$montant' } } }]),
      Payment.aggregate([
        { $match: { date_paiement: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$montant' } } },
      ]),
    ]);

    const priceMap = new Map(latestPricingByProduct.map((p) => [p._id.toString(), p]));
    const stockMap = new Map(stockByProduct.map((s) => [s._id.toString(), s.stock_total]));
    const supplierNameMap = new Map(suppliers.map((s) => [s._id.toString(), s.nom]));

    const valeurParProduit = (productId: string) => {
      const stock = stockMap.get(productId) ?? 0;
      const pricing = priceMap.get(productId);
      return pricing ? stock * pricing.prix_revente_final : 0;
    };

    // Valeur totale du stock = somme(quantité × prix de revente actuel).
    let valeurTotaleStock = 0;
    for (const [productId] of stockMap) {
      valeurTotaleStock += valeurParProduit(productId);
    }

    // Marge moyenne par catégorie.
    const margeParCategorie = new Map<string, { total: number; count: number }>();
    for (const p of allProducts) {
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

    // Répartition fournisseurs (risque de dépendance).
    const parFournisseur = new Map<string, { nom: string; valeur: number; count: number }>();
    for (const p of allProducts) {
      const valeur = valeurParProduit(p._id.toString());
      const key = p.fournisseur_id ? p.fournisseur_id.toString() : 'aucun';
      const nom = p.fournisseur_id ? supplierNameMap.get(key) ?? 'Fournisseur inconnu' : 'Sans fournisseur';
      const bucket = parFournisseur.get(key) || { nom, valeur: 0, count: 0 };
      bucket.valeur += valeur;
      bucket.count += 1;
      parFournisseur.set(key, bucket);
    }
    const repartitionFournisseurs = Array.from(parFournisseur.values())
      .map((f) => ({ ...f, valeur: Math.round(f.valeur * 100) / 100 }))
      .sort((a, b) => b.valeur - a.valeur);

    // Répartition origine (import Chine vs local).
    const parOrigine = new Map<string, { valeur: number; count: number }>();
    for (const p of allProducts) {
      const valeur = valeurParProduit(p._id.toString());
      const bucket = parOrigine.get(p.origine) || { valeur: 0, count: 0 };
      bucket.valeur += valeur;
      bucket.count += 1;
      parOrigine.set(p.origine, bucket);
    }
    const repartitionOrigine = Array.from(parOrigine.entries()).map(([origine, v]) => ({
      origine,
      valeur: Math.round(v.valeur * 100) / 100,
      count: v.count,
    }));

    // Valeur immobilisée par statut logistique.
    const parStatut = new Map<string, number>();
    for (const p of allProducts) {
      const valeur = valeurParProduit(p._id.toString());
      parStatut.set(p.statut, (parStatut.get(p.statut) ?? 0) + valeur);
    }
    const valeurParStatut = Array.from(parStatut.entries()).map(([statut, valeur]) => ({
      statut,
      valeur: Math.round(valeur * 100) / 100,
    }));

    // Ventes des 30 derniers jours (basées sur les entrées commande_client
    // passées à "livre_client" — voir src/app/api/orders/[id]/route.ts).
    // Le CA utilise le prix de revente ACTUEL du produit, pas un prix
    // historisé par vente (non enregistré pour l'instant).
    let chiffreAffaires30j = 0;
    const ventesParProduit = new Map<string, { nom: string; quantite: number }>();
    for (const sale of recentSales as any[]) {
      const product = sale.product_variant_id?.product_id;
      if (!product) continue;
      const pricing = priceMap.get(product._id.toString());
      if (pricing) chiffreAffaires30j += sale.quantite * pricing.prix_revente_final;

      const bucket = ventesParProduit.get(product._id.toString()) || { nom: product.nom, quantite: 0 };
      bucket.quantite += sale.quantite;
      ventesParProduit.set(product._id.toString(), bucket);
    }
    const meilleuresVentes = Array.from(ventesParProduit.values())
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, 5);

    // Ventes par jour (30j) pour le graphique en courbe.
    const parJour = new Map<string, number>();
    for (const sale of recentSales as any[]) {
      const product = sale.product_variant_id?.product_id;
      if (!product) continue;
      const pricing = priceMap.get(product._id.toString());
      if (!pricing) continue;
      const jour = new Date(sale.date_maj).toISOString().slice(0, 10);
      parJour.set(jour, (parJour.get(jour) ?? 0) + sale.quantite * pricing.prix_revente_final);
    }
    const ventesParJour = Array.from(parJour.entries())
      .map(([date, ca]) => ({ date, ca: Math.round(ca * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Prévision simple : moyenne quotidienne des 30 derniers jours × 30.
    // Estimation grossière, pas un modèle statistique — peu d'historique.
    const previsionCA30j = Math.round((chiffreAffaires30j / 30) * 30 * 100) / 100;

    // Points d'attention : incohérences détectables automatiquement.
    const imageCountMap = new Map(imagesCountByProduct.map((i) => [i._id.toString(), i.count]));
    const pointsAttention: { type: string; message: string; lien: string; severite: 'critique' | 'attention' }[] = [];
    for (const p of allProducts) {
      const id = p._id.toString();
      if (p.statut === 'archive') continue;
      if (!priceMap.has(id)) {
        pointsAttention.push({
          type: 'prix_manquant',
          message: `"${p.nom}" n'a aucun prix enregistré`,
          lien: `/products/${id}`,
          severite: 'critique',
        });
      }
      if (!stockMap.has(id)) {
        pointsAttention.push({
          type: 'variante_manquante',
          message: `"${p.nom}" n'a aucune variante`,
          lien: `/products/${id}`,
          severite: 'critique',
        });
      }
      if (!imageCountMap.has(id)) {
        pointsAttention.push({
          type: 'image_manquante',
          message: `"${p.nom}" n'a aucune image`,
          lien: `/products/${id}`,
          severite: 'attention',
        });
      }
    }
    for (const o of stuckOrders as any[]) {
      const nom = o.product_variant_id?.product_id?.nom ?? 'Produit supprimé';
      pointsAttention.push({
        type: 'commande_bloquee',
        message: `Entrée "${nom}" bloquée au statut "${o.statut}" depuis plus de 14 jours`,
        lien: `/orders`,
        severite: 'attention',
      });
    }

    // Encaissements / reste à payer sur les commandes clients (facturation légère).
    const paymentsByOrderMap = new Map(paymentsByOrder.map((p) => [p._id.toString(), p.total]));
    let resteAPayer = 0;
    for (const o of allClientOrders as any[]) {
      const productId = o.product_variant_id?.product_id?.toString();
      const pricing = productId ? priceMap.get(productId) : undefined;
      if (!pricing) continue;
      const total = pricing.prix_revente_final * o.quantite;
      const encaisse = paymentsByOrderMap.get(o._id.toString()) ?? 0;
      resteAPayer += Math.max(0, total - encaisse);
    }
    const encaissements30j = (encaissements30jAgg as any[])[0]?.total ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        totalProduits,
        valeurTotaleStock: Math.round(valeurTotaleStock * 100) / 100,
        margeMoyenneParCategorie,
        alertesRupture: lowStockVariants,
        produitsEnTransit,
        repartitionFournisseurs,
        repartitionOrigine,
        valeurParStatut,
        ventes30j: {
          nombreVentes: (recentSales as any[]).length,
          chiffreAffaires: Math.round(chiffreAffaires30j * 100) / 100,
          meilleuresVentes,
          parJour: ventesParJour,
          previsionCA30jSuivants: previsionCA30j,
          encaissements30j: Math.round(encaissements30j * 100) / 100,
          resteAPayer: Math.round(resteAPayer * 100) / 100,
        },
        pointsAttention,
      },
    });
  } catch (error) {
    console.error('Error computing dashboard stats:', error);
    return NextResponse.json({ success: false, error: 'Failed to compute dashboard stats' }, { status: 500 });
  }
}
