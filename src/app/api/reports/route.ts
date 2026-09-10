import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import ProductVariant from '@/lib/models/ProductVariant';
import ProductPricing from '@/lib/models/ProductPricing';
import Supplier from '@/lib/models/Supplier';
import OrderTracking from '@/lib/models/OrderTracking';
import Payment from '@/lib/models/Payment';
import { buildPriceIndex, resolvePrice } from '@/lib/priceResolver';
import { bucketKey, Periode } from '@/lib/dateBucket';

const PERIODES: Periode[] = ['jour', 'semaine', 'mois'];
const GROUPES = ['categorie', 'fournisseur', 'produit'] as const;
type Groupe = (typeof GROUPES)[number];

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const dateFin = searchParams.get('date_fin') ? new Date(searchParams.get('date_fin')!) : now;
    dateFin.setHours(23, 59, 59, 999);
    const dateDebut = searchParams.get('date_debut')
      ? new Date(searchParams.get('date_debut')!)
      : new Date(dateFin.getTime() - 30 * 24 * 60 * 60 * 1000);
    dateDebut.setHours(0, 0, 0, 0);

    const categorie = searchParams.get('categorie') || undefined;
    const fournisseurId = searchParams.get('fournisseur_id') || undefined;
    const origine = searchParams.get('origine') || undefined;
    const statut = searchParams.get('statut') || undefined;
    const periodeParam = searchParams.get('periode');
    const periode: Periode = PERIODES.includes(periodeParam as Periode) ? (periodeParam as Periode) : 'jour';
    const groupeParam = searchParams.get('groupe');
    const groupe: Groupe = GROUPES.includes(groupeParam as Groupe) ? (groupeParam as Groupe) : 'categorie';

    const productFilter: Record<string, unknown> = {};
    if (categorie) productFilter.categorie = categorie;
    if (fournisseurId) productFilter.fournisseur_id = fournisseurId;
    if (origine) productFilter.origine = origine;
    if (statut) productFilter.statut = statut;

    const [allProducts, suppliers] = await Promise.all([
      Product.find(productFilter).select('nom categorie statut origine fournisseur_id').lean(),
      Supplier.find().select('nom').lean(),
    ]);

    const productIds = allProducts.map((p) => p._id);
    const productIdSet = new Set(productIds.map((id) => id.toString()));

    const [allVariants, margeByProduct, recentSales, allClientOrders, paymentsByOrder, encaissementsAgg, priceIndex] =
      await Promise.all([
        ProductVariant.find({ product_id: { $in: productIds } }).select('product_id modele stock_quantite').lean(),
        ProductPricing.aggregate([
          { $sort: { date_effet: -1 } },
          { $group: { _id: '$product_id', marge_pourcentage: { $first: '$marge_pourcentage' } } },
        ]),
        OrderTracking.find({
          type: 'commande_client',
          statut: 'livre_client',
          date_maj: { $gte: dateDebut, $lte: dateFin },
        })
          .populate({ path: 'product_variant_id', select: 'product_id modele', populate: { path: 'product_id', select: 'nom' } })
          .lean(),
        OrderTracking.find({ type: 'commande_client' })
          .select('quantite montant_total product_variant_id')
          .populate({ path: 'product_variant_id', select: 'product_id modele' })
          .lean(),
        Payment.aggregate([{ $group: { _id: '$order_tracking_id', total: { $sum: '$montant' } } }]),
        Payment.aggregate([
          { $match: { date_paiement: { $gte: dateDebut, $lte: dateFin } } },
          { $group: { _id: null, total: { $sum: '$montant' } } },
        ]),
        buildPriceIndex(productIds),
      ]);

    const margeMap = new Map(margeByProduct.map((m) => [m._id.toString(), m.marge_pourcentage]));
    const supplierNameMap = new Map(suppliers.map((s) => [s._id.toString(), s.nom]));

    // Valeur d'un produit = somme, PAR VARIANTE, de (stock × prix résolu pour son modèle).
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

    // Marge moyenne par catégorie (indicateur global, basé sur le prix par défaut).
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

    // Répartition générique, pilotée par `groupe`.
    const parGroupe = new Map<string, { nom: string; valeur: number; count: number }>();
    for (const p of allProducts) {
      const valeur = valeurParProduit.get(p._id.toString()) ?? 0;
      let key: string;
      let nom: string;
      if (groupe === 'categorie') {
        key = p.categorie;
        nom = p.categorie;
      } else if (groupe === 'fournisseur') {
        key = p.fournisseur_id ? p.fournisseur_id.toString() : 'aucun';
        nom = p.fournisseur_id ? supplierNameMap.get(key) ?? 'Fournisseur inconnu' : 'Sans fournisseur';
      } else {
        key = p._id.toString();
        nom = p.nom;
      }
      const bucket = parGroupe.get(key) || { nom, valeur: 0, count: 0 };
      bucket.valeur += valeur;
      bucket.count += 1;
      parGroupe.set(key, bucket);
    }
    const repartition = Array.from(parGroupe.values())
      .map((r) => ({ ...r, valeur: Math.round(r.valeur * 100) / 100 }))
      .sort((a, b) => b.valeur - a.valeur);

    // Répartition origine.
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

    // Ventes sur la période demandée, restreintes aux produits filtrés.
    let chiffreAffaires = 0;
    const ventesParProduit = new Map<string, { nom: string; quantite: number }>();
    const parBucket = new Map<string, number>();
    let nombreVentes = 0;
    for (const sale of recentSales as any[]) {
      const product = sale.product_variant_id?.product_id;
      if (!product) continue;
      if (!productIdSet.has(product._id.toString())) continue;

      const montantVente =
        sale.montant_total ??
        (() => {
          const prix = resolvePrice(priceIndex, product._id.toString(), sale.product_variant_id?.modele);
          return prix != null ? prix * sale.quantite : null;
        })();
      if (montantVente == null) continue;

      nombreVentes += 1;
      chiffreAffaires += montantVente;
      const key = bucketKey(new Date(sale.date_maj), periode);
      parBucket.set(key, (parBucket.get(key) ?? 0) + montantVente);

      const bucket = ventesParProduit.get(product._id.toString()) || { nom: product.nom, quantite: 0 };
      bucket.quantite += sale.quantite;
      ventesParProduit.set(product._id.toString(), bucket);
    }
    const meilleuresVentes = Array.from(ventesParProduit.values())
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, 5);
    const parPeriode = Array.from(parBucket.entries())
      .map(([date, ca]) => ({ date, ca: Math.round(ca * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Points d'attention : état présent du stock, non daté, mais restreint aux produits filtrés.
    const pointsAttention: { type: string; message: string; lien: string; severite: 'critique' | 'attention' }[] = [];
    const stockTotalByProduct = new Map<string, number>();
    for (const v of allVariants as any[]) {
      const id = v.product_id.toString();
      stockTotalByProduct.set(id, (stockTotalByProduct.get(id) ?? 0) + v.stock_quantite);
    }
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
    }

    // Encaissements / reste à payer sur les commandes clients, restreints aux produits filtrés.
    const paymentsByOrderMap = new Map(paymentsByOrder.map((p) => [p._id.toString(), p.total]));
    let resteAPayer = 0;
    for (const o of allClientOrders as any[]) {
      const productId = o.product_variant_id?.product_id?.toString();
      if (!productId || !productIdSet.has(productId)) continue;
      const total =
        o.montant_total ??
        (() => {
          const prix = resolvePrice(priceIndex, productId, o.product_variant_id?.modele);
          return prix != null ? prix * o.quantite : null;
        })();
      if (total == null) continue;
      const encaisse = paymentsByOrderMap.get(o._id.toString()) ?? 0;
      resteAPayer += Math.max(0, total - encaisse);
    }
    const encaissements = (encaissementsAgg as any[])[0]?.total ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        filtres: {
          date_debut: dateDebut.toISOString().slice(0, 10),
          date_fin: dateFin.toISOString().slice(0, 10),
          categorie: categorie ?? null,
          fournisseur_id: fournisseurId ?? null,
          origine: origine ?? null,
          statut: statut ?? null,
          periode,
          groupe,
        },
        totalProduits: allProducts.length,
        valeurTotaleStock: Math.round(valeurTotaleStock * 100) / 100,
        margeMoyenneParCategorie,
        repartition,
        repartitionOrigine,
        valeurParStatut,
        ventes: {
          nombreVentes,
          chiffreAffaires: Math.round(chiffreAffaires * 100) / 100,
          meilleuresVentes,
          parPeriode,
          encaissements: Math.round(encaissements * 100) / 100,
          resteAPayer: Math.round(resteAPayer * 100) / 100,
        },
        pointsAttention,
      },
    });
  } catch (error) {
    console.error('Error computing report:', error);
    return NextResponse.json({ success: false, error: 'Failed to compute report' }, { status: 500 });
  }
}
