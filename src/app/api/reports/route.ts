import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import ProductPricing from '@/lib/models/ProductPricing';
import Supplier from '@/lib/models/Supplier';
import OrderTracking from '@/lib/models/OrderTracking';
import Payment from '@/lib/models/Payment';
import { buildPriceIndex, resolvePrice } from '@/lib/priceResolver';
import { bucketKey, Periode } from '@/lib/dateBucket';
import { canSeeFinancials, getRole } from '@/lib/authz';

const PERIODES: Periode[] = ['jour', 'semaine', 'mois'];
const GROUPES = ['categorie', 'fournisseur', 'produit'] as const;
type Groupe = (typeof GROUPES)[number];

export async function GET(request: NextRequest) {
  try {
    const showFinancials = canSeeFinancials(getRole(request));
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
      Product.find(productFilter)
        .select('nom categorie statut origine fournisseur_id couleurs_disponibles tailles_disponibles')
        .lean(),
      Supplier.find().select('nom').lean(),
    ]);

    const productIds = allProducts.map((p) => p._id);
    const productIdSet = new Set(productIds.map((id) => id.toString()));

    // Période précédente, de même durée, pour calculer une variation — la
    // comparaison à la période précédente est plus parlante qu'un chiffre isolé.
    const periodMs = dateFin.getTime() - dateDebut.getTime();
    const datePrecFin = new Date(dateDebut.getTime() - 1);
    const datePrecDebut = new Date(datePrecFin.getTime() - periodMs);

    const [margeByProduct, recentSales, salesPrecedentes, allClientOrders, paymentsByOrder, encaissementsAgg, priceIndex] =
      await Promise.all([
        ProductPricing.aggregate([
          { $sort: { date_effet: -1 } },
          { $group: { _id: '$product_id', marge_pourcentage: { $first: '$marge_pourcentage' } } },
        ]),
        OrderTracking.find({
          type: 'commande_client',
          statut: 'livre_client',
          date_maj: { $gte: dateDebut, $lte: dateFin },
        })
          .populate({ path: 'product_id', select: 'nom' })
          .lean(),
        OrderTracking.find({
          type: 'commande_client',
          statut: 'livre_client',
          date_maj: { $gte: datePrecDebut, $lte: datePrecFin },
        })
          .select('quantite montant_total product_id')
          .lean(),
        OrderTracking.find({ type: 'commande_client' })
          .select('quantite montant_total product_id')
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

    const produitsDisponibles = allProducts.filter((p) => p.statut === 'disponible').length;

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

    // Répartition générique (nombre de produits), pilotée par `groupe`.
    const parGroupe = new Map<string, { nom: string; count: number }>();
    for (const p of allProducts) {
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
      const bucket = parGroupe.get(key) || { nom, count: 0 };
      bucket.count += 1;
      parGroupe.set(key, bucket);
    }
    const repartition = Array.from(parGroupe.values()).sort((a, b) => b.count - a.count);

    // Répartition origine.
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

    // Ventes sur la période demandée, restreintes aux produits filtrés.
    let chiffreAffaires = 0;
    const ventesParProduit = new Map<string, { nom: string; quantite: number; ca: number }>();
    const parBucket = new Map<string, number>();
    let nombreVentes = 0;
    for (const sale of recentSales as any[]) {
      const product = sale.product_id;
      if (!product) continue;
      if (!productIdSet.has(product._id.toString())) continue;

      const montantVente =
        sale.montant_total ??
        (() => {
          const prix = resolvePrice(priceIndex, product._id.toString());
          return prix != null ? prix * sale.quantite : null;
        })();
      if (montantVente == null) continue;

      nombreVentes += 1;
      chiffreAffaires += montantVente;
      const key = bucketKey(new Date(sale.date_maj), periode);
      parBucket.set(key, (parBucket.get(key) ?? 0) + montantVente);

      const bucket = ventesParProduit.get(product._id.toString()) || { nom: product.nom, quantite: 0, ca: 0 };
      bucket.quantite += sale.quantite;
      bucket.ca += montantVente;
      ventesParProduit.set(product._id.toString(), bucket);
    }
    // Ventes de la période précédente — sert uniquement à la variation % et
    // à la tendance par produit (quantité), pas de détail par bucket nécessaire.
    let chiffreAffairesPrecedent = 0;
    const quantiteParProduitPrecedent = new Map<string, number>();
    for (const sale of salesPrecedentes as any[]) {
      const productId = sale.product_id?.toString();
      if (!productId || !productIdSet.has(productId)) continue;
      const montantVente =
        sale.montant_total ??
        (() => {
          const prix = resolvePrice(priceIndex, productId);
          return prix != null ? prix * sale.quantite : null;
        })();
      if (montantVente != null) chiffreAffairesPrecedent += montantVente;
      quantiteParProduitPrecedent.set(productId, (quantiteParProduitPrecedent.get(productId) ?? 0) + sale.quantite);
    }
    // Variation vs période précédente — null si la période précédente est à
    // zéro (une variation % n'a pas de sens en partant de rien).
    const variationCA =
      chiffreAffairesPrecedent > 0
        ? Math.round(((chiffreAffaires - chiffreAffairesPrecedent) / chiffreAffairesPrecedent) * 10000) / 100
        : null;

    // Classé par chiffre d'affaires généré, pas par quantité (voir dashboard/stats).
    // "tendance" compare la quantité vendue à la période précédente pour le même produit.
    const meilleuresVentes = Array.from(ventesParProduit.entries())
      .sort((a, b) => b[1].ca - a[1].ca)
      .slice(0, 5)
      .map(([productId, v]) => {
        const qtePrecedente = quantiteParProduitPrecedent.get(productId) ?? 0;
        const tendance: 'hausse' | 'baisse' | 'stable' =
          v.quantite > qtePrecedente ? 'hausse' : v.quantite < qtePrecedente ? 'baisse' : 'stable';
        return { ...v, ca: Math.round(v.ca * 100) / 100, tendance };
      });
    const parPeriode = Array.from(parBucket.entries())
      .map(([date, ca]) => ({ date, ca: Math.round(ca * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Fourchette de prévision pour une période future de même durée : plutôt
    // qu'un chiffre unique (faussement précis), on donne "si la prochaine
    // période ressemble à ta pire/meilleure période observée ici".
    // Nécessite au moins 2 buckets pour que la fourchette veuille dire quelque chose.
    let previsionBasse: number | null = null;
    let previsionHaute: number | null = null;
    if (parPeriode.length >= 2) {
      const valeurs = parPeriode.map((b) => b.ca);
      previsionBasse = Math.round(Math.min(...valeurs) * parPeriode.length * 100) / 100;
      previsionHaute = Math.round(Math.max(...valeurs) * parPeriode.length * 100) / 100;
    }

    // Risque de rupture : heuristique simple basée sur le nombre de
    // couleurs/tailles encore cochées (pas de quantité chiffrée à observer,
    // voir la décision produit) — 1 restante = Élevé, 2 = Moyen, 3+ = Faible.
    // Les produits sans aucune couleur/taille sont déjà comptés en critique
    // dans les points d'attention, on ne les recompte pas ici.
    let risqueEleve = 0;
    let risqueMoyen = 0;
    let risqueFaible = 0;
    for (const p of allProducts) {
      if (p.statut !== 'disponible') continue;
      const comptes = [p.couleurs_disponibles?.length ?? 0, p.tailles_disponibles?.length ?? 0].filter((n) => n > 0);
      if (comptes.length === 0) continue;
      const restant = Math.min(...comptes);
      if (restant === 1) risqueEleve += 1;
      else if (restant === 2) risqueMoyen += 1;
      else risqueFaible += 1;
    }

    // Points d'attention : état présent du catalogue, non daté, restreint aux produits filtrés.
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
      } else if (p.statut === 'disponible' && (p.couleurs_disponibles?.length === 1 || p.tailles_disponibles?.length === 1)) {
        pointsAttention.push({
          type: 'stock_faible',
          message: `"${p.nom}" n'a plus qu'une seule ${p.couleurs_disponibles?.length === 1 ? 'couleur' : 'taille'} disponible — pense à réapprovisionner`,
          lien: `/products/${id}`,
          severite: 'attention',
        });
      }
    }

    // Encaissements / reste à payer sur les commandes clients, restreints aux produits filtrés.
    const paymentsByOrderMap = new Map(paymentsByOrder.map((p) => [p._id.toString(), p.total]));
    let resteAPayer = 0;
    for (const o of allClientOrders as any[]) {
      const productId = o.product_id?.toString();
      if (!productId || !productIdSet.has(productId)) continue;
      const total =
        o.montant_total ??
        (() => {
          const prix = resolvePrice(priceIndex, productId);
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
        produitsDisponibles,
        margeMoyenneParCategorie: showFinancials ? margeMoyenneParCategorie : [],
        repartition,
        repartitionOrigine,
        produitsParStatut,
        ventes: {
          nombreVentes,
          chiffreAffaires: showFinancials ? Math.round(chiffreAffaires * 100) / 100 : null,
          variationCA: showFinancials ? variationCA : null,
          meilleuresVentes: showFinancials
            ? meilleuresVentes
            : meilleuresVentes.map((v) => ({ nom: v.nom, quantite: v.quantite, tendance: v.tendance })),
          parPeriode: showFinancials ? parPeriode : [],
          encaissements: showFinancials ? Math.round(encaissements * 100) / 100 : null,
          resteAPayer: showFinancials ? Math.round(resteAPayer * 100) / 100 : null,
          prevision: showFinancials ? { basse: previsionBasse, haute: previsionHaute } : { basse: null, haute: null },
        },
        risqueRupture: { eleve: risqueEleve, moyen: risqueMoyen, faible: risqueFaible },
        pointsAttention,
      },
    });
  } catch (error) {
    console.error('Error computing report:', error);
    return NextResponse.json({ success: false, error: 'Failed to compute report' }, { status: 500 });
  }
}
