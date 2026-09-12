import { NextResponse } from 'next/server';
import Product from '@/lib/models/Product';
import ProductPricing from '@/lib/models/ProductPricing';
import Supplier from '@/lib/models/Supplier';
import OrderTracking from '@/lib/models/OrderTracking';
import ProductImage from '@/lib/models/ProductImage';
import Payment from '@/lib/models/Payment';
import { dbConnect } from '@/lib/db/connection';
import { buildPriceIndex, resolvePrice } from '@/lib/priceResolver';

export async function GET() {
  try {
    await dbConnect();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [
      margeByProduct,
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
      // Marge du prix par défaut (indicateur global par catégorie).
      ProductPricing.aggregate([
        { $sort: { date_effet: -1 } },
        { $group: { _id: '$product_id', marge_pourcentage: { $first: '$marge_pourcentage' } } },
      ]),
      Product.find({ statut: 'en_transit' }).select('nom reference categorie').limit(20).lean(),
      Product.countDocuments(),
      Product.find().select('nom categorie statut origine fournisseur_id couleurs_disponibles tailles_disponibles').lean(),
      Supplier.find().select('nom').lean(),
      OrderTracking.find({ type: 'commande_client', statut: 'livre_client', date_maj: { $gte: thirtyDaysAgo } })
        .populate({ path: 'product_id', select: 'nom' })
        .lean(),
      ProductImage.aggregate([{ $group: { _id: '$product_id', count: { $sum: 1 } } }]),
      OrderTracking.find({
        date_maj: { $lt: fourteenDaysAgo },
        $or: [
          { type: 'commande_client', statut: { $ne: 'livre_client' } },
          { type: 'reappro_fournisseur', statut: { $ne: 'recu' } },
        ],
      })
        .populate({ path: 'product_id', select: 'nom' })
        .limit(20)
        .lean(),
      OrderTracking.find({ type: 'commande_client' })
        .select('quantite montant_total product_id')
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

    const produitsDisponibles = allProducts.filter((p) => p.statut === 'disponible').length;

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

    // Répartition fournisseurs (risque de dépendance) — en nombre de produits.
    const parFournisseur = new Map<string, { nom: string; count: number }>();
    for (const p of allProducts) {
      const key = p.fournisseur_id ? p.fournisseur_id.toString() : 'aucun';
      const nom = p.fournisseur_id ? supplierNameMap.get(key) ?? 'Fournisseur inconnu' : 'Sans fournisseur';
      const bucket = parFournisseur.get(key) || { nom, count: 0 };
      bucket.count += 1;
      parFournisseur.set(key, bucket);
    }
    const repartitionFournisseurs = Array.from(parFournisseur.values()).sort((a, b) => b.count - a.count);

    // Répartition origine (import Chine vs local) — en nombre de produits.
    const parOrigine = new Map<string, number>();
    for (const p of allProducts) {
      parOrigine.set(p.origine, (parOrigine.get(p.origine) ?? 0) + 1);
    }
    const repartitionOrigine = Array.from(parOrigine.entries()).map(([origine, count]) => ({ origine, count }));

    // Produits par statut logistique.
    const parStatut = new Map<string, number>();
    for (const p of allProducts) {
      parStatut.set(p.statut, (parStatut.get(p.statut) ?? 0) + 1);
    }
    const produitsParStatut = Array.from(parStatut.entries()).map(([statut, count]) => ({ statut, count }));

    // Ventes des 30 derniers jours. Utilise le prix figé sur la commande
    // (prix_unitaire/montant_total, voir src/app/api/orders/route.ts) —
    // avec repli sur le prix actuel résolu pour les entrées créées avant
    // l'ajout de ce champ.
    let chiffreAffaires30j = 0;
    const ventesParProduit = new Map<string, { nom: string; quantite: number }>();
    const parJour = new Map<string, number>();
    for (const sale of recentSales as any[]) {
      const product = sale.product_id;
      if (!product) continue;

      const montantVente =
        sale.montant_total ??
        (() => {
          const prix = resolvePrice(priceIndex, product._id.toString());
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
      if (!priceIndex.has(id)) {
        pointsAttention.push({
          type: 'prix_manquant',
          message: `"${p.nom}" n'a aucun prix enregistré`,
          lien: `/products/${id}`,
          severite: 'critique',
        });
      }
      if ((p.couleurs_disponibles?.length ?? 0) === 0 && (p.tailles_disponibles?.length ?? 0) === 0) {
        pointsAttention.push({
          type: 'disponibilite_manquante',
          message: `"${p.nom}" n'a aucune couleur ni taille renseignée`,
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
      const nom = o.product_id?.nom ?? 'Produit supprimé';
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
      const productId = o.product_id?.toString();
      const total =
        o.montant_total ??
        (productId ? (() => {
          const prix = resolvePrice(priceIndex, productId);
          return prix != null ? prix * o.quantite : null;
        })() : null);
      if (total == null) continue;
      const encaisse = paymentsByOrderMap.get(o._id.toString()) ?? 0;
      resteAPayer += Math.max(0, total - encaisse);
    }
    const encaissements30j = (encaissements30jAgg as any[])[0]?.total ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        totalProduits,
        produitsDisponibles,
        margeMoyenneParCategorie,
        produitsEnTransit,
        repartitionFournisseurs,
        repartitionOrigine,
        produitsParStatut,
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
