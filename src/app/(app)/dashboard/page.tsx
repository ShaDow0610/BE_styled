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
  product: { nom: string };
}

interface ProduitEnTransit {
  _id: string;
  nom: string;
  reference: string;
  categorie: string;
}

interface DashboardStats {
  totalProduits: number;
  valeurTotaleStock: number;
  margeMoyenneParCategorie: MargeParCategorie[];
  alertesRupture: AlerteRupture[];
  produitsEnTransit: ProduitEnTransit[];
}

const EMPTY_STATS: DashboardStats = {
  totalProduits: 0,
  valeurTotaleStock: 0,
  margeMoyenneParCategorie: [],
  alertesRupture: [],
  produitsEnTransit: [],
};

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink"></div>
      </div>
    );
  }

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

      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Produits"
          value={stats.totalProduits}
          icon={<FontAwesomeIcon icon={faBox} />}
          color="bg-ink"
        />
        <StatCard
          title="Valeur du Stock"
          value={`$${stats.valeurTotaleStock.toLocaleString()}`}
          icon={<FontAwesomeIcon icon={faChartLine} />}
          color="bg-ink-soft"
        />
        <StatCard
          title="Alertes Rupture"
          value={stats.alertesRupture.length}
          icon={<FontAwesomeIcon icon={faTriangleExclamation} />}
          color="bg-ink-soft"
        />
        <StatCard
          title="Produits en Transit"
          value={stats.produitsEnTransit.length}
          icon={<FontAwesomeIcon icon={faTruck} />}
          color="bg-ink"
        />
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

        {/* Alertes rupture */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="font-serif text-xl text-ink mb-4">Alertes rupture</h2>
          {stats.alertesRupture.length > 0 ? (
            <ul className="divide-y divide-silver-soft">
              {stats.alertesRupture.map((a) => (
                <li key={a._id} className="py-2 text-sm">
                  <p className="font-medium text-ink">{a.product?.nom}</p>
                  <p className="text-ink-soft/70">
                    {a.sku_variante} · {a.taille}/{a.couleur} — {a.stock_quantite} en stock
                    (seuil {a.seuil_alerte})
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft/70 text-sm py-4">Aucune alerte de stock faible.</p>
          )}
        </motion.div>

        {/* Produits en transit */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow-lg p-6 lg:col-span-2">
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
