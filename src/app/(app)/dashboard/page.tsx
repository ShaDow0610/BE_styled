"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import StatCard from "@/components/dashboard/StatCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBox,
  faChartLine,
  faTriangleExclamation,
  faTruck,
  faCartShopping,
} from "@fortawesome/free-solid-svg-icons";

interface MargeParCategorie {
  categorie: string;
  marge_moyenne: number;
}

interface AlerteRupture {
  _id: string;
  sku_variante: string;
  taille: string;
  couleur: string;
  stock_quantite: number;
  seuil_alerte: number;
  product_id: string;
  product: { nom: string };
}

interface ProduitEnTransit {
  _id: string;
  nom: string;
  reference: string;
  categorie: string;
}

interface RepartitionFournisseur {
  nom: string;
  valeur: number;
  count: number;
}

interface RepartitionOrigine {
  origine: string;
  valeur: number;
  count: number;
}

interface ValeurParStatut {
  statut: string;
  valeur: number;
}

interface Ventes30j {
  nombreVentes: number;
  chiffreAffaires: number;
  meilleuresVentes: { nom: string; quantite: number }[];
}

interface DashboardStats {
  totalProduits: number;
  valeurTotaleStock: number;
  margeMoyenneParCategorie: MargeParCategorie[];
  alertesRupture: AlerteRupture[];
  produitsEnTransit: ProduitEnTransit[];
  repartitionFournisseurs: RepartitionFournisseur[];
  repartitionOrigine: RepartitionOrigine[];
  valeurParStatut: ValeurParStatut[];
  ventes30j: Ventes30j;
}

const EMPTY_STATS: DashboardStats = {
  totalProduits: 0,
  valeurTotaleStock: 0,
  margeMoyenneParCategorie: [],
  alertesRupture: [],
  produitsEnTransit: [],
  repartitionFournisseurs: [],
  repartitionOrigine: [],
  valeurParStatut: [],
  ventes30j: { nombreVentes: 0, chiffreAffaires: 0, meilleuresVentes: [] },
};

const STATUT_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  en_commande: "En commande",
  en_transit: "En transit",
  en_confection: "En confection",
  disponible: "Disponible",
  rupture: "Rupture",
  archive: "Archivé",
};

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [creatingReappro, setCreatingReappro] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchStats();
  }, [router]);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const handleCreateReappro = async (alerte: AlerteRupture) => {
    setCreatingReappro(alerte._id);
    try {
      const quantiteSuggeree = Math.max(1, alerte.seuil_alerte - alerte.stock_quantite + 5);
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_variant_id: alerte._id,
          type: "reappro_fournisseur",
          quantite: quantiteSuggeree,
        }),
      });
      router.push("/orders");
    } finally {
      setCreatingReappro(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink"></div>
      </div>
    );
  }

  const valeurImmobilisee = stats.valeurParStatut.filter((v) => v.statut !== "disponible");

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-8">
        <h1 className="font-serif text-3xl text-ink">Dashboard</h1>
        <button
          onClick={handleLogout}
          className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
          Se déconnecter
        </button>
      </motion.div>

      {/* Stats Cards — cliquables */}
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Link href="/products">
          <StatCard
            title="Total Produits"
            value={stats.totalProduits}
            icon={<FontAwesomeIcon icon={faBox} />}
            color="bg-ink"
          />
        </Link>
        <a href="#repartition">
          <StatCard
            title="Valeur du Stock"
            value={`$${stats.valeurTotaleStock.toLocaleString()}`}
            icon={<FontAwesomeIcon icon={faChartLine} />}
            color="bg-ink-soft"
          />
        </a>
        <a href="#alertes">
          <StatCard
            title="Alertes Rupture"
            value={stats.alertesRupture.length}
            icon={<FontAwesomeIcon icon={faTriangleExclamation} />}
            color="bg-ink-soft"
          />
        </a>
        <a href="#transit">
          <StatCard
            title="Produits en Transit"
            value={stats.produitsEnTransit.length}
            icon={<FontAwesomeIcon icon={faTruck} />}
            color="bg-ink"
          />
        </a>
        <a href="#ventes">
          <StatCard
            title="Ventes (30j)"
            value={`$${stats.ventes30j.chiffreAffaires.toLocaleString()}`}
            icon={<FontAwesomeIcon icon={faCartShopping} />}
            color="bg-ink-soft"
          />
        </a>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Marge moyenne par catégorie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="font-serif text-xl text-ink mb-4">
            Marge moyenne par catégorie
          </h2>
          {stats.margeMoyenneParCategorie.length > 0 ? (
            <ul className="divide-y divide-silver-soft">
              {stats.margeMoyenneParCategorie.map((m) => (
                <li key={m.categorie} className="flex justify-between py-2 text-sm">
                  <span className="capitalize text-ink-soft">{m.categorie}</span>
                  <span className="font-semibold text-ink">{m.marge_moyenne}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft/70 text-sm py-4">Aucune donnée de prix pour le moment.</p>
          )}
        </motion.div>

        {/* Alertes rupture — actionnables */}
        <motion.div
          id="alertes"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-lg p-6 scroll-mt-6">
          <h2 className="font-serif text-xl text-ink mb-4">Alertes rupture</h2>
          {stats.alertesRupture.length > 0 ? (
            <ul className="divide-y divide-silver-soft">
              {stats.alertesRupture.map((a) => (
                <li key={a._id} className="py-3 text-sm flex justify-between items-center gap-3">
                  <Link href={`/products/${a.product_id}`} className="flex-1 min-w-0">
                    <p className="font-medium text-ink truncate">{a.product?.nom}</p>
                    <p className="text-ink-soft/70">
                      {a.sku_variante} · {a.taille}/{a.couleur} — {a.stock_quantite} en stock
                      (seuil {a.seuil_alerte})
                    </p>
                  </Link>
                  <button
                    onClick={() => handleCreateReappro(a)}
                    disabled={creatingReappro === a._id}
                    className="shrink-0 px-3 py-1.5 border border-ink text-ink rounded-lg text-xs font-medium hover:bg-ink hover:text-ivory transition-colors disabled:opacity-50">
                    {creatingReappro === a._id ? "..." : "Créer un réappro"}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft/70 text-sm py-4">Aucune alerte de stock faible.</p>
          )}
        </motion.div>

        {/* Ventes récentes */}
        <motion.div
          id="ventes"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-lg shadow-lg p-6 scroll-mt-6">
          <h2 className="font-serif text-xl text-ink mb-1">Ventes (30 derniers jours)</h2>
          <p className="text-ink-soft/60 text-xs mb-4">
            CA estimé au prix de revente actuel — {stats.ventes30j.nombreVentes} vente(s)
          </p>
          {stats.ventes30j.meilleuresVentes.length > 0 ? (
            <ul className="divide-y divide-silver-soft">
              {stats.ventes30j.meilleuresVentes.map((v) => (
                <li key={v.nom} className="flex justify-between py-2 text-sm">
                  <span className="text-ink-soft">{v.nom}</span>
                  <span className="font-semibold text-ink">{v.quantite} vendu(s)</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft/70 text-sm py-4">
              Aucune vente enregistrée sur la période. Les ventes se comptabilisent quand une
              entrée "Commande client" passe au statut "Livré" dans le suivi des commandes.
            </p>
          )}
        </motion.div>

        {/* Répartition fournisseurs / origine */}
        <motion.div
          id="repartition"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow-lg p-6 scroll-mt-6">
          <h2 className="font-serif text-xl text-ink mb-4">Répartition du stock</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-ink-soft/70 uppercase mb-2">Par fournisseur</p>
              {stats.repartitionFournisseurs.length > 0 ? (
                <ul className="space-y-2">
                  {stats.repartitionFournisseurs.map((f) => (
                    <li key={f.nom} className="text-sm flex justify-between">
                      <span className="text-ink-soft">{f.nom}</span>
                      <span className="font-semibold text-ink">${f.valeur.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-ink-soft/70 text-sm">Aucune donnée.</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-soft/70 uppercase mb-2">Par origine</p>
              {stats.repartitionOrigine.length > 0 ? (
                <ul className="space-y-2">
                  {stats.repartitionOrigine.map((o) => (
                    <li key={o.origine} className="text-sm flex justify-between">
                      <span className="text-ink-soft">
                        {o.origine === "import_chine" ? "Import Chine" : "Local"} ({o.count})
                      </span>
                      <span className="font-semibold text-ink">${o.valeur.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-ink-soft/70 text-sm">Aucune donnée.</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Valeur immobilisée par statut */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="font-serif text-xl text-ink mb-4">Valeur immobilisée</h2>
          {valeurImmobilisee.length > 0 ? (
            <ul className="divide-y divide-silver-soft">
              {valeurImmobilisee.map((v) => (
                <li key={v.statut} className="flex justify-between py-2 text-sm">
                  <span className="text-ink-soft">{STATUT_LABELS[v.statut] ?? v.statut}</span>
                  <span className="font-semibold text-ink">${v.valeur.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft/70 text-sm py-4">Tout le stock est disponible à la vente.</p>
          )}
        </motion.div>

        {/* Produits en transit */}
        <motion.div
          id="transit"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-lg p-6 lg:col-span-2 scroll-mt-6">
          <h2 className="font-serif text-xl text-ink mb-4">Produits en transit</h2>
          {stats.produitsEnTransit.length > 0 ? (
            <ul className="divide-y divide-silver-soft">
              {stats.produitsEnTransit.map((p) => (
                <li key={p._id} className="flex justify-between py-2 text-sm">
                  <Link href={`/products/${p._id}`} className="text-ink hover:text-ink-soft">
                    {p.nom}
                  </Link>
                  <span className="text-ink-soft/70">
                    {p.reference} · {p.categorie}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft/70 text-sm py-4">Aucun produit en transit actuellement.</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
