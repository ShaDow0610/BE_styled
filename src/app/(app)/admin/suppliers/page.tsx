"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/common/ToastProvider";
import { useUserRole } from "@/lib/useUserRole";
import { SkeletonTable } from "@/components/common/Skeleton";

interface Supplier {
  _id: string;
  nom: string;
  type: "usine_chine" | "couturier_local";
  delai_moyen_jours: number;
  contact: string;
  notes: string;
}

const EMPTY_FORM = { nom: "", type: "usine_chine" as Supplier["type"], delai_moyen_jours: "0", contact: "", notes: "" };

export default function SuppliersPage() {
  const router = useRouter();
  const toast = useToast();
  const { canWrite, isAdmin } = useUserRole();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
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
      const res = await fetch("/api/suppliers");
      if (res.ok) setSuppliers((await res.json()).data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingId(supplier._id);
    setForm({
      nom: supplier.nom,
      type: supplier.type,
      delai_moyen_jours: String(supplier.delai_moyen_jours ?? 0),
      contact: supplier.contact || "",
      notes: supplier.notes || "",
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
    const payload = { ...form, delai_moyen_jours: Number(form.delai_moyen_jours) || 0 };
    const res = await fetch(editingId ? `/api/suppliers/${editingId}` : "/api/suppliers", {
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
    toast.success(editingId ? "Fournisseur mis à jour" : "Fournisseur créé");
    handleCancel();
    load();
  };

  const handleDelete = async (supplier: Supplier) => {
    if (!window.confirm(`Supprimer définitivement "${supplier.nom}" ? Cette action est irréversible.`)) return;
    const res = await fetch(`/api/suppliers/${supplier._id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || !data.success) {
      toast.error(data.error || "Échec de la suppression");
      return;
    }
    toast.success("Fournisseur supprimé");
    load();
  };

  const filteredSuppliers = suppliers.filter((s) => s.nom.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="font-serif text-3xl text-ink">Fournisseurs</h1>
        <div className="flex flex-wrap gap-3">
          {canWrite && (
            <button
              onClick={() => (showForm ? handleCancel() : setShowForm(true))}
              className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
              {showForm ? "Annuler" : "Nouveau fournisseur"}
            </button>
          )}
          <Link href="/admin" className="px-4 py-2 border border-silver-soft text-ink-soft rounded-lg hover:bg-ivory-soft transition-colors">
            ← Retour
          </Link>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6 grid md:grid-cols-2 gap-4">
          <h2 className="md:col-span-2 font-serif text-xl text-ink">
            {editingId ? "Modifier le fournisseur" : "Nouveau fournisseur"}
          </h2>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Nom</label>
            <input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Supplier["type"] })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
              <option value="usine_chine">Usine Chine</option>
              <option value="couturier_local">Couturier local</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Délai moyen (jours)</label>
            <input type="number" min="0" value={form.delai_moyen_jours} onChange={(e) => setForm({ ...form, delai_moyen_jours: e.target.value })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Contact</label>
            <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-ink-soft mb-2">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
          </div>
          {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
          <div className="md:col-span-2 flex gap-3">
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
          placeholder="Rechercher un fournisseur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
        />
      </div>

      {isLoading ? (
        <SkeletonTable rows={5} cols={5} />
      ) : (
      <div className="bg-white rounded-lg shadow p-6">
        {filteredSuppliers.length === 0 ? (
          <p className="text-ink-soft/70 text-sm">Aucun fournisseur trouvé.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-soft/70 border-b border-silver-soft">
                <th className="py-2 pr-4">Nom</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Délai moyen</th>
                <th className="py-2 pr-4">Contact</th>
                {(canWrite || isAdmin) && <th className="py-2 pr-4"></th>}
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((s) => (
                <tr key={s._id} className="border-b border-silver-soft/50">
                  <td className="py-2 pr-4 text-ink font-medium">{s.nom}</td>
                  <td className="py-2 pr-4 text-ink-soft">{s.type === "usine_chine" ? "Usine Chine" : "Couturier local"}</td>
                  <td className="py-2 pr-4 text-ink-soft">{s.delai_moyen_jours} j</td>
                  <td className="py-2 pr-4 text-ink-soft/70">{s.contact || "—"}</td>
                  {(canWrite || isAdmin) && (
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-3 whitespace-nowrap">
                        {canWrite && (
                          <button onClick={() => handleEdit(s)} className="text-ink underline hover:no-underline text-xs">
                            Modifier
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => handleDelete(s)} className="text-red-600 hover:underline text-xs">
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
