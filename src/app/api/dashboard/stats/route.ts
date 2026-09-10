import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import ProductVariant from '@/lib/models/ProductVariant';
import ProductPricing from '@/lib/models/ProductPricing';
import Supplier from '@/lib/models/Supplier';
import OrderTracking from '@/lib/models/OrderTracking';
import ProductImage from '@/lib/models/ProductImage';
import Payment from '@/lib/models/Payment';
import { buildPriceIndex, resolvePrice } from '@/lib/priceResolver';

export async function GET() {
  try {
    await dbConnect();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [
      allVariants,
      margeByProduct,
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
      ProductVariant.find().select('product_id modele stock_quantite').lean(),
      // Marge du prix par défaut (pas par modèle — indicateur global par catégorie).
      ProductPricing.aggregate([
        { $sort: { date_effet: -1 } },
        { $group: { _id: '$product_id', marge_pourcentage: { $first: '$marge_pourcentage' } } },
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
        .populate({ path: 'product_variant_id', select: 'product_id modele', populate: { path: 'product_id', select: 'nom' } })
        .lean(),
      ProductImage.aggregate([{ $group: { _id: '$product_id', count: { $sum: 1 } } }]),
      OrderTracking.find({ stock_applique: false, date_maj: { $lt: fourteenDaysAgo } })
        .populate({ path: 'product_variant_id', select: 'sku_variante product_id', populate: { path: 'product_id', select: 'nom' } })
        .limit(20)
        .lean(),
      OrderTracking.find({ type: 'commande_client' })
        .select('quantite montant_total product_variant_id')
        .populate({ path: 'product_variant_id', select: 'product_id modele' })
        .lean(),
      Payment.aggregate([{ $group: { _id: '$order_tracking_id', total: { $sum: '$montant' } } }]),
      Payment.aggregate([
        { $match: { date_paiement: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$montant' } } },
      ]),
    ]);

    const productIds = allProducts.map((p) => p._id);
    const priceIndex = await buildPriceIndex(productIds);

    const margeMap = new Map(margeByProduct.map((m) => [m._id.toString(), m.marge_pourcentage]));
    const supplierNameMap = new Map(suppliers.map((s) => [s._id.toString(), s.nom]));

    // Stock total par produit (pour les points d'attention "sans variante").
    const stockTotalByProduct = new Map<string, number>();
    for (const v of allVariants as any[]) {
      const id = v.product_id.toString();
      stockTotalByProduct.set(id, (stockTotalByProduct.get(id) ?? 0) + v.stock_quantite);
    }

    // Valeur d'un produit = somme, PAR VARIANTE, de (stock × prix résolu pour
    // son modèle) — plus précis qu'un simple prix par produit, puisque deux
    // modèles d'un même produit peuvent avoir des prix différents.
    const valeurParProduit = new Map<string, number>();
    let valeurTotaleStock = 0;
    for (const v of allVariants as any[]) {
      const productId = v.product_id.toString();
      const prix = resolvePrice(priceIndex, productId, v.modele);
      if (prix == null) continue;
      const valeur = prix * v.stock_quantite;
      valeurParProduit.set(productId, (valeurParProduit.get(productId) ?? 0) + valeur);
      valeurTotaleStock += valeur;
    }

    // Marge moyenne par catégorie (basée sur le prix par défaut du produit).
    const margeParCategorie = new Map<string, { total: number; count: number }>();
    for (const p of allProducts) {
      const marge = margeMap.get(p._id.toString());
      if (marge == null) continue;
      const bucket = margeParCategorie.get(p.categorie) || { total: 0, count: 0 };
      bucket.total += marge;
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
      const valeur = valeurParProduit.get(p._id.toString()) ?? 0;
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
      const valeur = valeurParProduit.get(p._id.toString()) ?? 0;
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
      const valeur = valeurParProduit.get(p._id.toString()) ?? 0;
      parStatut.set(p.statut, (parStatut.get(p.statut) ?? 0) + valeur);
    }
    const valeurParStatut = Array.from(parStatut.entries()).map(([statut, valeur]) => ({
      statut,
      valeur: Math.round(valeur * 100) / 100,
    }));

    // Ventes des 30 derniers jours. Utilise le prix figé sur la commande
    // (prix_unitaire/montant_total, voir src/app/api/orders/route.ts) —
    // avec repli sur le prix actuel résolu pour les entrées créées avant
    // l'ajout de ce champ.
    let chiffreAffaires30j = 0;
    const ventesParProduit = new Map<string, { nom: string; quantite: number }>();
    const parJour = new Map<string, number>();
    for (const sale of recentSales as any[]) {
      const product = sale.product_variant_id?.product_id;
      if (!product) continue;

      const montantVente =
        sale.montant_total ??
        (() => {
          const prix = resolvePrice(priceIndex, product._id.toString(), sale.product_variant_id?.modele);
          return prix != null ? prix * sale.quantite : null;
        })();
      if (montantVente == null) continue;

      chiffreAffaires30j += montantVente;
      const jour = new Date(sale.date_maj).toISOString().slice(0, 10);
      parJour.set(jour, (parJour.get(jour) ?? 0) + montantVente);

      const bucket = ventesParProduit.get(product._id.toString()) || { nom: product.nom, quantite: 0 };
      bucket.quantite += sale.quantite;
      ventesParProduit.set(product._id.toString(), bucket);
    }
    const meilleuresVentes = Array.from(ventesParProduit.values())
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, 5);
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
      if (!priceIndex.allByProduct.has(id)) {
        pointsAttention.push({
          type: 'prix_manquant',
          message: `"${p.nom}" n'a aucun prix enregistré`,
          lien: `/products/${id}`,
          severite: 'critique',
        });
      }
      if (!stockTotalByProduct.has(id)) {
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
      const total =
        o.montant_total ??
        (() => {
          const productId = o.product_variant_id?.product_id?.toString();
          if (!productId) return null;
          const prix = resolvePrice(priceIndex, productId, o.product_variant_id?.modele);
          return prix != null ? prix * o.quantite : null;
        })();
      if (total == null) continue;
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
