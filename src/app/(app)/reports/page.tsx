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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp, faArrowDown, faMinus, faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import { useUserRole } from "@/lib/useUserRole";
import { formatXAF } from "@/lib/currency";
import { SkeletonPanel, SkeletonStatCards } from "@/components/common/Skeleton";

const PRODUCT_CATEGORIES = [
  "pantalon", "chemise", "tricot", "culotte", "bracelet",
  "montre", "chaussure", "bague", "chapeau", "lunette", "autre",
];
const PRODUCT_STATUSES = [
  "brouillon", "en_commande", "en_transit", "en_confection",
  "disponible", "rupture", "archive",
];

interface Supplier {
  _id: string;
  nom: string;
}

interface ReportData {
  filtres: {
    date_debut: string;
    date_fin: string;
    categorie: string | null;
    fournisseur_id: string | null;
    origine: string | null;
    statut: string | null;
    periode: "jour" | "semaine" | "mois";
    groupe: "categorie" | "fournisseur" | "produit";
  };
  totalProduits: number;
  produitsDisponibles: number;
  margeMoyenneParCategorie: { categorie: string; marge_moyenne: number }[];
  repartition: { nom: string; count: number }[];
  repartitionOrigine: { origine: string; count: number }[];
  produitsParStatut: { statut: string; count: number }[];
  ventes: {
    nombreVentes: number;
    chiffreAffaires: number;
    variationCA: number | null;
    meilleuresVentes: { nom: string; quantite: number; ca?: number; tendance: "hausse" | "baisse" | "stable" }[];
    parPeriode: { date: string; ca: number }[];
    encaissements: number;
    resteAPayer: number;
    prevision: { basse: number | null; haute: number | null };
  };
  risqueRupture: { eleve: number; moyen: number; faible: number };
  pointsAttention: { type: string; message: string; severite: string }[];
}

const EMPTY_FILTERS = {
  date_debut: "",
  date_fin: "",
  categorie: "",
  fournisseur_id: "",
  origine: "",
  statut: "",
  periode: "jour" as "jour" | "semaine" | "mois",
  groupe: "categorie" as "categorie" | "fournisseur" | "produit",
};

const GROUPE_LABELS: Record<string, string> = {
  categorie: "Catégorie",
  fournisseur: "Fournisseur",
  produit: "Produit",
};

const TENDANCE_ICON = { hausse: faArrowUp, baisse: faArrowDown, stable: faMinus };
const TENDANCE_COLOR = { hausse: "text-emerald-600", baisse: "text-red-600", stable: "text-ink-soft/50" };

export default function ReportsPage() {
  const router = useRouter();
  const { canSeeFinancials } = useUserRole();
  const [stats, setStats] = useState<ReportData | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem("user");
    if (!session) {
      router.push("/login");
      return;
    }
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((d) => setSuppliers(d.data || []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      fetch(`/api/reports?${params}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setStats(d.data);
        })
        .catch(() => {});
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [filters]);

  if (!stats) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <SkeletonPanel lines={2} />
        <SkeletonStatCards count={3} />
        <SkeletonPanel lines={4} />
      </div>
    );
  }

  const montant = (n: number) => (canSeeFinancials ? formatXAF(n) : "—");

  const filterLabel = (key: string, value: string) => {
    if (key === "fournisseur_id") return suppliers.find((s) => s._id === value)?.nom ?? value;
    return value;
  };

  const activeChips: { key: keyof typeof filters; label: string }[] = [
    filters.date_debut || filters.date_fin
      ? { key: "date_debut", label: `Période : ${filters.date_debut || "…"} → ${filters.date_fin || "aujourd'hui"}` }
      : null,
    filters.categorie ? { key: "categorie", label: `Catégorie : ${filters.categorie}` } : null,
    filters.fournisseur_id ? { key: "fournisseur_id", label: `Fournisseur : ${filterLabel("fournisseur_id", filters.fournisseur_id)}` } : null,
    filters.origine ? { key: "origine", label: `Origine : ${filters.origine}` } : null,
    filters.statut ? { key: "statut", label: `Statut : ${filters.statut}` } : null,
  ].filter((c): c is { key: keyof typeof filters; label: string } => c !== null);

  const clearChip = (key: keyof typeof filters) => {
    if (key === "date_debut") {
      setFilters({ ...filters, date_debut: "", date_fin: "" });
    } else {
      setFilters({ ...filters, [key]: "" });
    }
  };

  const printSummary = [...activeChips.map((c) => c.label), `Groupé par : ${GROUPE_LABELS[filters.groupe]}`].join(" · ");

  const risqueTotal = stats.risqueRupture.eleve + stats.risqueRupture.moyen + stats.risqueRupture.faible;

  return (
    <div className="container mx-auto px-4 py-8 print:py-0">
      <div className="flex justify-between items-center mb-8 print:hidden">
        <h1 className="font-serif text-3xl text-ink">Statistiques</h1>
        <button
          onClick={() => window.print()}
          className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
          Imprimer / Exporter en PDF
        </button>
      </div>

      <h1 className="hidden print:block font-serif text-2xl text-ink mb-2">
        Be Styled — Statistiques du {new Date().toLocaleDateString("fr-FR")}
      </h1>
      <p className="hidden print:block text-sm text-ink-soft mb-6">{printSummary}</p>

      <div className="mb-6 print:hidden">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-2 text-sm text-ink-soft hover:text-ink mb-3">
          <FontAwesomeIcon icon={showFilters ? faChevronUp : faChevronDown} className="w-3 h-3" />
          Filtres {activeChips.length > 0 && `(${activeChips.length})`}
        </button>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                onClick={() => clearChip(chip.key)}
                className="flex items-center gap-1.5 px-3 py-1 bg-ivory-soft border border-silver-soft rounded-full text-xs text-ink-soft hover:border-ink hover:text-ink">
                {chip.label} <span className="text-ink-soft/60">✕</span>
              </button>
            ))}
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="text-xs text-ink-soft underline hover:text-ink px-1">
              Réinitialiser tout
            </button>
          </div>
        )}

        {showFilters && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-2">Date de début</label>
                <input
                  type="date"
                  value={filters.date_debut}
                  onChange={(e) => setFilters({ ...filters, date_debut: e.target.value })}
                  className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-2">Date de fin</label>
                <input
                  type="date"
                  value={filters.date_fin}
                  onChange={(e) => setFilters({ ...filters, date_fin: e.target.value })}
                  className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-2">Catégorie</label>
                <select
                  value={filters.categorie}
                  onChange={(e) => setFilters({ ...filters, categorie: e.target.value })}
                  className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
                  <option value="">Toutes</option>
                  {PRODUCT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-2">Fournisseur</label>
                <select
                  value={filters.fournisseur_id}
                  onChange={(e) => setFilters({ ...filters, fournisseur_id: e.target.value })}
                  className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
                  <option value="">Tous</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>{s.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-2">Origine</label>
                <select
                  value={filters.origine}
                  onChange={(e) => setFilters({ ...filters, origine: e.target.value })}
                  className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
                  <option value="">Toutes</option>
                  <option value="import_chine">Import Chine</option>
                  <option value="local">Local</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-2">Statut</label>
                <select
                  value={filters.statut}
                  onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
                  className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
                  <option value="">Tous</option>
                  {PRODUCT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-2">Période du graphique</label>
                <select
                  value={filters.periode}
                  onChange={(e) => setFilters({ ...filters, periode: e.target.value as typeof filters.periode })}
                  className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
                  <option value="jour">Par jour</option>
                  <option value="semaine">Par semaine</option>
                  <option value="mois">Par mois</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-2">Grouper la répartition par</label>
                <select
                  value={filters.groupe}
                  onChange={(e) => setFilters({ ...filters, groupe: e.target.value as typeof filters.groupe })}
                  className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
                  <option value="categorie">Catégorie</option>
                  <option value="fournisseur">Fournisseur</option>
                  <option value="produit">Produit</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-ink-soft/70">Total produits</p>
          <p className="text-2xl font-bold text-ink">{stats.totalProduits}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-ink-soft/70">Produits disponibles</p>
          <p className="text-2xl font-bold text-ink">{stats.produitsDisponibles}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-ink-soft/70">CA (période sélectionnée)</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-ink">{montant(stats.ventes.chiffreAffaires)}</p>
            {canSeeFinancials && stats.ventes.variationCA != null && (
              <span className={`text-sm font-semibold ${stats.ventes.variationCA >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {stats.ventes.variationCA >= 0 ? "+" : ""}{stats.ventes.variationCA}%
              </span>
            )}
          </div>
          {canSeeFinancials && stats.ventes.variationCA != null && (
            <p className="text-xs text-ink-soft/60 mt-1">vs période précédente de même durée</p>
          )}
        </div>
      </div>

      {canSeeFinancials && stats.ventes.parPeriode.length > 1 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-serif text-xl text-ink mb-4">Évolution des ventes</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={stats.ventes.parPeriode}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="ca" stroke="#0b0b0c" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          {stats.ventes.prevision.basse != null && stats.ventes.prevision.haute != null && (
            <div className="mt-4 bg-ivory-soft rounded-lg p-4">
              <p className="text-xs text-ink-soft/70 mb-1">
                Prévision pour la prochaine période de même durée (fourchette basée sur ta pire/meilleure période observée ici)
              </p>
              <p className="text-lg font-semibold text-ink">
                {formatXAF(stats.ventes.prevision.basse)} – {formatXAF(stats.ventes.prevision.haute)}
              </p>
            </div>
          )}
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
          <h2 className="font-serif text-xl text-ink mb-4">Meilleures ventes (période)</h2>
          {stats.ventes.meilleuresVentes.length > 0 ? (
            <ul className="divide-y divide-silver-soft">
              {stats.ventes.meilleuresVentes.map((v) => (
                <li key={v.nom} className="flex justify-between items-center py-2 text-sm">
                  <span className="text-ink-soft flex items-center gap-2">
                    <FontAwesomeIcon
                      icon={TENDANCE_ICON[v.tendance]}
                      className={`w-3 h-3 ${TENDANCE_COLOR[v.tendance]}`}
                      title={`Tendance : ${v.tendance} vs période précédente`}
                    />
                    {v.nom}
                  </span>
                  <span className="text-right">
                    <span className="font-semibold text-ink">{v.quantite} vendu(s)</span>
                    {canSeeFinancials && v.ca != null && (
                      <span className="block text-xs text-ink-soft/60">{montant(v.ca)}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft/70 text-sm">Aucune vente sur la période.</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-serif text-xl text-ink mb-4">Points d&apos;attention</h2>
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

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="font-serif text-xl text-ink mb-1">Risque de rupture</h2>
        <p className="text-xs text-ink-soft/60 mb-4">
          Estimation basée sur le nombre de couleurs/tailles encore cochées comme disponibles — pas un stock chiffré.
        </p>
        {risqueTotal === 0 ? (
          <p className="text-ink-soft/70 text-sm">Aucun produit disponible à évaluer.</p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.risqueRupture.eleve}</p>
              <p className="text-xs text-red-700 mt-1">Risque élevé</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.risqueRupture.moyen}</p>
              <p className="text-xs text-amber-700 mt-1">Risque moyen</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{stats.risqueRupture.faible}</p>
              <p className="text-xs text-emerald-700 mt-1">Risque faible</p>
            </div>
          </div>
        )}
      </div>

      {canSeeFinancials && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-serif text-xl text-ink mb-4">Répartition par {GROUPE_LABELS[filters.groupe].toLowerCase()}</h2>
            <ul className="space-y-2 text-sm">
              {stats.repartition.map((r) => (
                <li key={r.nom} className="flex justify-between">
                  <span className="text-ink-soft">{r.nom}</span>
                  <span className="font-semibold text-ink">{r.count}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-serif text-xl text-ink mb-4">Produits par statut</h2>
            <ul className="space-y-2 text-sm">
              {stats.produitsParStatut
                .filter((v) => v.statut !== "disponible")
                .map((v) => (
                  <li key={v.statut} className="flex justify-between">
                    <span className="text-ink-soft">{v.statut}</span>
                    <span className="font-semibold text-ink">{v.count}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
