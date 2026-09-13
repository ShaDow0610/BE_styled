"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/common/ToastProvider";
import { useUserRole } from "@/lib/useUserRole";
import { SkeletonTable } from "@/components/common/Skeleton";
import { activeToggleClasses } from "@/lib/statusColors";

interface Brand {
  _id: string;
  nom: string;
  categorie_accessoire: string;
  contact: string;
  conditions_commerciales: string;
  actif: boolean;
}

const EMPTY_FORM = { nom: "", categorie_accessoire: "", contact: "", conditions_commerciales: "" };

export default function BrandsPage() {
  const router = useRouter();
  const toast = useToast();
  const { canWrite, isAdmin } = useUserRole();
  const [brands, setBrands] = useState<Brand[]>([]);
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
      const res = await fetch("/api/brands");
      if (res.ok) setBrands((await res.json()).data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingId(brand._id);
    setForm({
      nom: brand.nom,
      categorie_accessoire: brand.categorie_accessoire || "",
      contact: brand.contact || "",
      conditions_commerciales: brand.conditions_commerciales || "",
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
    const res = await fetch(editingId ? `/api/brands/${editingId}` : "/api/brands", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setError(data.error || "Erreur lors de l'enregistrement");
      toast.error(data.error || "Erreur lors de l'enregistrement");
      return;
    }
    toast.success(editingId ? "Marque mise à jour" : "Marque créée");
    handleCancel();
    load();
  };

  const handleDelete = async (brand: Brand) => {
    if (!window.confirm(`Supprimer définitivement "${brand.nom}" ? Cette action est irréversible.`)) return;
    const res = await fetch(`/api/brands/${brand._id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || !data.success) {
      toast.error(data.error || "Échec de la suppression");
      return;
    }
    toast.success("Marque supprimée");
    load();
  };

  const handleToggleActif = async (brand: Brand) => {
    const res = await fetch(`/api/brands/${brand._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: !brand.actif }),
    });
    if (!res.ok) {
      toast.error("Échec de la mise à jour");
      return;
    }
    toast.success(brand.actif ? "Marque désactivée" : "Marque réactivée");
    load();
  };

  const filteredBrands = brands.filter((b) => b.nom.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl text-ink">Marques partenaires</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          {canWrite && (
            <button
              onClick={() => (showForm ? handleCancel() : setShowForm(true))}
              className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
              {showForm ? "Annuler" : "Nouvelle marque"}
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
            {editingId ? "Modifier la marque" : "Nouvelle marque"}
          </h2>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Nom</label>
            <input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Catégorie accessoire</label>
            <input value={form.categorie_accessoire} onChange={(e) => setForm({ ...form, categorie_accessoire: e.target.value })}
              placeholder="Ex: montres, bracelets"
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Contact</label>
            <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Conditions commerciales</label>
            <input value={form.conditions_commerciales} onChange={(e) => setForm({ ...form, conditions_commerciales: e.target.value })}
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
          placeholder="Rechercher une marque..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
        />
      </div>

      {isLoading ? (
        <SkeletonTable rows={5} cols={4} />
      ) : (
      <div className="bg-white rounded-lg shadow p-6">
        {filteredBrands.length === 0 ? (
          <p className="text-ink-soft/70 text-sm">Aucune marque trouvée.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-soft/70 border-b border-silver-soft">
                <th className="py-2 pr-4">Nom</th>
                <th className="py-2 pr-4">Catégorie</th>
                <th className="py-2 pr-4">Contact</th>
                <th className="py-2 pr-4">Statut</th>
                {(canWrite || isAdmin) && <th className="py-2 pr-4"></th>}
              </tr>
            </thead>
            <tbody>
              {filteredBrands.map((b) => (
                <tr key={b._id} className="border-b border-silver-soft/50">
                  <td className="py-2 pr-4 text-ink font-medium">{b.nom}</td>
                  <td className="py-2 pr-4 text-ink-soft">{b.categorie_accessoire || "—"}</td>
                  <td className="py-2 pr-4 text-ink-soft/70">{b.contact || "—"}</td>
                  <td className="py-2 pr-4">
                    <button
                      onClick={() => canWrite && handleToggleActif(b)}
                      disabled={!canWrite}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${activeToggleClasses(b.actif)}`}>
                      {b.actif ? "Actif" : "Inactif"}
                    </button>
                  </td>
                  {(canWrite || isAdmin) && (
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-3 whitespace-nowrap">
                        {canWrite && (
                          <button onClick={() => handleEdit(b)} className="text-ink underline hover:no-underline text-xs">
                            Modifier
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => handleDelete(b)} className="text-red-600 hover:underline text-xs">
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
