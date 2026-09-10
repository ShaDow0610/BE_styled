"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/common/ToastProvider";

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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!token) {
      router.push("/login");
      return;
    }
    if (userData) {
      const role = JSON.parse(userData).role;
      setCanWrite(role === "admin" || role === "gestion_stock");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, delai_moyen_jours: Number(form.delai_moyen_jours) || 0 }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setError(data.error || "Erreur lors de la création");
      toast.error(data.error || "Erreur lors de la création");
      return;
    }
    setForm(EMPTY_FORM);
    setShowForm(false);
    toast.success("Fournisseur créé");
    load();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
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
              onClick={() => setShowForm((v) => !v)}
              className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
              Nouveau fournisseur
            </button>
          )}
          <Link href="/admin" className="px-4 py-2 border border-silver-soft text-ink-soft rounded-lg hover:bg-ivory-soft transition-colors">
            ← Retour
          </Link>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6 grid md:grid-cols-2 gap-4">
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
          <div className="md:col-span-2">
            <button type="submit" className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
              Créer
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

      <div className="bg-white rounded-lg shadow p-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ink"></div>
          </div>
        ) : filteredSuppliers.length === 0 ? (
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
                {canWrite && <th className="py-2 pr-4"></th>}
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((s) => (
                <tr key={s._id} className="border-b border-silver-soft/50">
                  <td className="py-2 pr-4 text-ink font-medium">{s.nom}</td>
                  <td className="py-2 pr-4 text-ink-soft">{s.type === "usine_chine" ? "Usine Chine" : "Couturier local"}</td>
                  <td className="py-2 pr-4 text-ink-soft">{s.delai_moyen_jours} j</td>
                  <td className="py-2 pr-4 text-ink-soft/70">{s.contact || "—"}</td>
                  {canWrite && (
                    <td className="py-2 pr-4">
                      <button onClick={() => handleDelete(s._id)} className="text-red-600 hover:underline text-xs">
                        Supprimer
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
