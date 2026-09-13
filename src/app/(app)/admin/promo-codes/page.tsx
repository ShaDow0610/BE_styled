"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/common/ToastProvider";
import { useUserRole } from "@/lib/useUserRole";
import { SkeletonTable } from "@/components/common/Skeleton";
import { activeToggleClasses } from "@/lib/statusColors";

interface PromoCode {
  _id: string;
  code: string;
  reduction_pourcentage: number;
  source: string;
  nombre_utilisations: number;
  actif: boolean;
}

const EMPTY_FORM = { code: "", reduction_pourcentage: "10", source: "site_vitrine" };

export default function PromoCodesPage() {
  const router = useRouter();
  const toast = useToast();
  const { canWrite, isAdmin } = useUserRole();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const session = localStorage.getItem("user");
    if (!session) {
      router.push("/login");
      return;
    }
    load();
  }, [router]);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/promo-codes");
      if (res.ok) setPromoCodes((await res.json()).data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (promo: PromoCode) => {
    setEditingId(promo._id);
    setForm({
      code: promo.code,
      reduction_pourcentage: String(promo.reduction_pourcentage),
      source: promo.source,
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const payload = { ...form, reduction_pourcentage: Number(form.reduction_pourcentage) };
    const res = await fetch(editingId ? `/api/promo-codes/${editingId}` : "/api/promo-codes", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setError(data.error || "Erreur lors de l'enregistrement");
      toast.error(data.error || "Erreur lors de l'enregistrement");
      return;
    }
    toast.success(editingId ? "Code promo mis à jour" : "Code promo créé");
    handleCancel();
    load();
  };

  const toggleActif = async (promo: PromoCode) => {
    await fetch(`/api/promo-codes/${promo._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: !promo.actif }),
    });
    toast.success(promo.actif ? "Code désactivé" : "Code activé");
    load();
  };

  const handleDelete = async (promo: PromoCode) => {
    if (!window.confirm(`Supprimer définitivement le code "${promo.code}" ? Cette action est irréversible.`)) return;
    const res = await fetch(`/api/promo-codes/${promo._id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || !data.success) {
      toast.error(data.error || "Échec de la suppression");
      return;
    }
    toast.success("Code promo supprimé");
    load();
  };

  const filteredPromoCodes = promoCodes.filter((p) => p.code.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="font-serif text-3xl text-ink">Codes promo</h1>
        <div className="flex flex-wrap gap-3">
          {canWrite && (
            <button
              onClick={() => (showForm ? handleCancel() : setShowForm(true))}
              className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
              {showForm ? "Annuler" : "Nouveau code"}
            </button>
          )}
          <Link href="/admin" className="px-4 py-2 border border-silver-soft text-ink-soft rounded-lg hover:bg-ivory-soft transition-colors">
            ← Retour
          </Link>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6 grid md:grid-cols-3 gap-4">
          <h2 className="md:col-span-3 font-serif text-xl text-ink">
            {editingId ? "Modifier le code promo" : "Nouveau code"}
          </h2>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Code</label>
            <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="Ex: BIENVENUE10"
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Réduction (%)</label>
            <input type="number" min="0" max="100" required value={form.reduction_pourcentage}
              onChange={(e) => setForm({ ...form, reduction_pourcentage: e.target.value })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Source</label>
            <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
          </div>
          {error && <p className="md:col-span-3 text-sm text-red-600">{error}</p>}
          <div className="md:col-span-3 flex gap-3">
            <button type="submit" className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
              {editingId ? "Enregistrer" : "Créer"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 border border-silver-soft text-ink-soft rounded-lg hover:bg-ivory-soft transition-colors">
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 max-w-md">
        <input
          type="text"
          placeholder="Rechercher un code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
        />
      </div>

      {isLoading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : (
      <div className="bg-white rounded-lg shadow p-6">
        {filteredPromoCodes.length === 0 ? (
          <p className="text-ink-soft/70 text-sm">Aucun code promo trouvé.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-soft/70 border-b border-silver-soft">
                <th className="py-2 pr-4">Code</th>
                <th className="py-2 pr-4">Réduction</th>
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4">Utilisations</th>
                <th className="py-2 pr-4">Statut</th>
                {(canWrite || isAdmin) && <th className="py-2 pr-4"></th>}
              </tr>
            </thead>
            <tbody>
              {filteredPromoCodes.map((p) => (
                <tr key={p._id} className="border-b border-silver-soft/50">
                  <td className="py-2 pr-4 text-ink font-medium">{p.code}</td>
                  <td className="py-2 pr-4 text-ink-soft">{p.reduction_pourcentage}%</td>
                  <td className="py-2 pr-4 text-ink-soft">{p.source}</td>
                  <td className="py-2 pr-4 text-ink-soft/70">{p.nombre_utilisations}</td>
                  <td className="py-2 pr-4">
                    <button
                      onClick={() => canWrite && toggleActif(p)}
                      disabled={!canWrite}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${activeToggleClasses(p.actif)}`}>
                      {p.actif ? "Actif" : "Inactif"}
                    </button>
                  </td>
                  {(canWrite || isAdmin) && (
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-3 whitespace-nowrap">
                        {canWrite && (
                          <button onClick={() => handleEdit(p)} className="text-ink underline hover:no-underline text-xs">
                            Modifier
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => handleDelete(p)} className="text-red-600 hover:underline text-xs">
                            Supprimer
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
