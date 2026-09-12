"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import StatCard from "@/components/dashboard/StatCard";
import { useUserRole } from "@/lib/useUserRole";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBox,
  faCheckCircle,
  faTruck,
  faCartShopping,
  faCircleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { formatXAF } from "@/lib/currency";

interface MargeParCategorie {
  categorie: string;
  marge_moyenne: number;
}

interface ProduitEnTransit {
  _id: string;
  nom: string;
  reference: string;
  categorie: string;
}

interface RepartitionFournisseur {
  nom: string;
  count: number;
}

interface RepartitionOrigine {
  origine: string;
  count: number;
}

interface ProduitsParStatut {
  statut: string;
  count: number;
}

interface Ventes30j {
  nombreVentes: number;
  chiffreAffaires: number;
  meilleuresVentes: { nom: string; quantite: number }[];
  parJour: { date: string; ca: number }[];
  previsionCA30jSuivants: number;
  encaissements30j: number;
  resteAPayer: number;
}

interface PointAttention {
  type: string;
  message: string;
  lien: string;
  severite: "critique" | "attention";
}

interface DashboardStats {
  totalProduits: number;
  produitsDisponibles: number;
  margeMoyenneParCategorie: MargeParCategorie[];
  produitsEnTransit: ProduitEnTransit[];
  repartitionFournisseurs: RepartitionFournisseur[];
  repartitionOrigine: RepartitionOrigine[];
  produitsParStatut: ProduitsParStatut[];
  ventes30j: Ventes30j;
  pointsAttention: PointAttention[];
}

const EMPTY_STATS: DashboardStats = {
  totalProduits: 0,
  produitsDisponibles: 0,
  margeMoyenneParCategorie: [],
  produitsEnTransit: [],
  repartitionFournisseurs: [],
  repartitionOrigine: [],
  produitsParStatut: [],
  ventes30j: { nombreVentes: 0, chiffreAffaires: 0, meilleuresVentes: [], parJour: [], previsionCA30jSuivants: 0, encaissements30j: 0, resteAPayer: 0 },
  pointsAttention: [],
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
  const { canSeeFinancials } = useUserRole();
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

  const produitsEnCours = stats.produitsParStatut.filter((v) => v.statut !== "disponible");
  const montant = (n: number) => (canSeeFinancials ? formatXAF(n) : "—");

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
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link href="/products">
          <StatCard title="Total Produits" value={stats.totalProduits} icon={<FontAwesomeIcon icon={faBox} />} color="bg-ink" />
        </Link>
        <a href="#repartition">
          <StatCard title="Produits disponibles" value={stats.produitsDisponibles} icon={<FontAwesomeIcon icon={faCheckCircle} />} color="bg-ink-soft" />
        </a>
        <a href="#transit">
          <StatCard title="Produits en Transit" value={stats.produitsEnTransit.length} icon={<FontAwesomeIcon icon={faTruck} />} color="bg-ink" />
        </a>
        <a href="#ventes">
          <StatCard title="Ventes (30j)" value={montant(stats.ventes30j.chiffreAffaires)} icon={<FontAwesomeIcon icon={faCartShopping} />} color="bg-ink-soft" />
        </a>
      </div>

      {/* Points d'attention */}
      {stats.pointsAttention.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg p-6 mb-6 border-l-4 border-amber-500">
          <h2 className="font-serif text-xl text-ink mb-4">Points d'attention</h2>
          <ul className="space-y-2">
            {stats.pointsAttention.map((p, idx) => (
              <li key={idx} className="flex items-center gap-3 text-sm">
                <FontAwesomeIcon
                  icon={faCircleExclamation}
                  className={`w-4 h-4 shrink-0 ${p.severite === "critique" ? "text-red-600" : "text-amber-500"}`}
                />
                <Link href={p.lien} className="text-ink-soft hover:text-ink truncate">
                  {p.message}
                </Link>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Marge moyenne par catégorie */}
        {canSeeFinancials && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="font-serif text-xl text-ink mb-4">Marge moyenne par catégorie</h2>
            {stats.margeMoyenneParCategorie.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.margeMoyenneParCategorie}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="categorie" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip />
                  <Bar dataKey="marge_moyenne" fill="#0b0b0c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-ink-soft/70 text-sm py-4">Aucune donnée de prix pour le moment.</p>
            )}
          </motion.div>
        )}

        {/* Ventes récentes */}
        <motion.div
          id="ventes"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-lg shadow-lg p-6 scroll-mt-6">
          <h2 className="font-serif text-xl text-ink mb-1">Ventes (30 derniers jours)</h2>
          <p className="text-ink-soft/60 text-xs mb-4">
            {stats.ventes30j.nombreVentes} vente(s)
            {canSeeFinancials && (
              <> · CA estimé au prix de revente actuel · prévision 30j suivants : {montant(stats.ventes30j.previsionCA30jSuivants)} (estimation basée sur peu d'historique)</>
            )}
          </p>
          {canSeeFinancials && stats.ventes30j.parJour.length > 1 && (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.ventes30j.parJour}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="ca" stroke="#0b0b0c" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
          {canSeeFinancials && (
            <div className="grid sm:grid-cols-2 gap-4 mt-4 mb-4">
              <div className="bg-ivory-soft rounded-lg p-4">
                <p className="text-xs text-ink-soft/70">Encaissé (30j)</p>
                <p className="text-xl font-bold text-ink">{montant(stats.ventes30j.encaissements30j)}</p>
              </div>
              <div className={`rounded-lg p-4 ${stats.ventes30j.resteAPayer > 0 ? "bg-amber-50" : "bg-ivory-soft"}`}>
                <p className="text-xs text-ink-soft/70">Reste à payer (commandes clients)</p>
                <p className={`text-xl font-bold ${stats.ventes30j.resteAPayer > 0 ? "text-amber-600" : "text-ink"}`}>
                  {montant(stats.ventes30j.resteAPayer)}
                </p>
              </div>
            </div>
          )}
          {stats.ventes30j.meilleuresVentes.length > 0 ? (
            <ul className="divide-y divide-silver-soft mt-4">
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
        {canSeeFinancials && (
          <motion.div
            id="repartition"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow-lg p-6 scroll-mt-6">
            <h2 className="font-serif text-xl text-ink mb-4">Répartition du catalogue</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-ink-soft/70 uppercase mb-2">Par fournisseur</p>
                {stats.repartitionFournisseurs.length > 0 ? (
                  <ul className="space-y-2">
                    {stats.repartitionFournisseurs.map((f) => (
                      <li key={f.nom} className="text-sm flex justify-between">
                        <span className="text-ink-soft">{f.nom}</span>
                        <span className="font-semibold text-ink">{f.count}</span>
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
                          {o.origine === "import_chine" ? "Import Chine" : "Local"}
                        </span>
                        <span className="font-semibold text-ink">{o.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-ink-soft/70 text-sm">Aucune donnée.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Produits en cours (hors disponible) */}
        {canSeeFinancials && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="font-serif text-xl text-ink mb-4">Produits en cours (pipeline)</h2>
            {produitsEnCours.length > 0 ? (
              <ul className="divide-y divide-silver-soft">
                {produitsEnCours.map((v) => (
                  <li key={v.statut} className="flex justify-between py-2 text-sm">
                    <span className="text-ink-soft">{STATUT_LABELS[v.statut] ?? v.statut}</span>
                    <span className="font-semibold text-ink">{v.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-soft/70 text-sm py-4">Tous les produits sont disponibles à la vente.</p>
            )}
          </motion.div>
        )}

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
