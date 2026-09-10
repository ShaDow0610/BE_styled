"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { useUserRole } from "@/lib/useUserRole";

interface Stats {
  totalProduits: number;
  valeurTotaleStock: number;
  margeMoyenneParCategorie: { categorie: string; marge_moyenne: number }[];
  alertesRupture: unknown[];
  produitsEnTransit: unknown[];
  repartitionFournisseurs: { nom: string; valeur: number; count: number }[];
  repartitionOrigine: { origine: string; valeur: number; count: number }[];
  valeurParStatut: { statut: string; valeur: number }[];
  ventes30j: {
    nombreVentes: number;
    chiffreAffaires: number;
    meilleuresVentes: { nom: string; quantite: number }[];
    parJour: { date: string; ca: number }[];
    previsionCA30jSuivants: number;
  };
  pointsAttention: { type: string; message: string; severite: string }[];
}

export default function ReportsPage() {
  const router = useRouter();
  const { canSeeFinancials } = useUserRole();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => setStats(d.data));
  }, [router]);

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink"></div>
      </div>
    );
  }

  const montant = (n: number) => (canSeeFinancials ? `$${n.toLocaleString()}` : "—");

  return (
    <div className="container mx-auto px-4 py-8 print:py-0">
      <div className="flex justify-between items-center mb-8 print:hidden">
        <h1 className="font-serif text-3xl text-ink">Rapports</h1>
        <button
          onClick={() => window.print()}
          className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
          Imprimer / Exporter en PDF
        </button>
      </div>

      <h1 className="hidden print:block font-serif text-2xl text-ink mb-6">
        Be Styled — Rapport du {new Date().toLocaleDateString("fr-FR")}
      </h1>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-ink-soft/70">Total produits</p>
          <p className="text-2xl font-bold text-ink">{stats.totalProduits}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-ink-soft/70">Valeur du stock</p>
          <p className="text-2xl font-bold text-ink">{montant(stats.valeurTotaleStock)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-ink-soft/70">CA (30 derniers jours)</p>
          <p className="text-2xl font-bold text-ink">{montant(stats.ventes30j.chiffreAffaires)}</p>
        </div>
      </div>

      {canSeeFinancials && stats.ventes30j.parJour.length > 1 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-serif text-xl text-ink mb-4">Évolution des ventes</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={stats.ventes30j.parJour}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="ca" stroke="#0b0b0c" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {canSeeFinancials && stats.margeMoyenneParCategorie.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-serif text-xl text-ink mb-4">Marge moyenne par catégorie</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.margeMoyenneParCategorie}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="categorie" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit="%" />
              <Tooltip />
              <Bar dataKey="marge_moyenne" fill="#0b0b0c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-serif text-xl text-ink mb-4">Meilleures ventes (30j)</h2>
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
            <p className="text-ink-soft/70 text-sm">Aucune vente sur la période.</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-serif text-xl text-ink mb-4">Points d'attention</h2>
          {stats.pointsAttention.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {stats.pointsAttention.map((p, idx) => (
                <li key={idx} className={p.severite === "critique" ? "text-red-600" : "text-amber-600"}>
                  {p.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft/70 text-sm">Aucune incohérence détectée.</p>
          )}
        </div>
      </div>

      {canSeeFinancials && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-serif text-xl text-ink mb-4">Répartition par fournisseur</h2>
            <ul className="space-y-2 text-sm">
              {stats.repartitionFournisseurs.map((f) => (
                <li key={f.nom} className="flex justify-between">
                  <span className="text-ink-soft">{f.nom}</span>
                  <span className="font-semibold text-ink">{montant(f.valeur)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-serif text-xl text-ink mb-4">Valeur immobilisée par statut</h2>
            <ul className="space-y-2 text-sm">
              {stats.valeurParStatut
                .filter((v) => v.statut !== "disponible")
                .map((v) => (
                  <li key={v.statut} className="flex justify-between">
                    <span className="text-ink-soft">{v.statut}</span>
                    <span className="font-semibold text-ink">{montant(v.valeur)}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
