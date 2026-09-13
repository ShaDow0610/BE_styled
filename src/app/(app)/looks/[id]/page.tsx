"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatXAF } from "@/lib/currency";
import { useUserRole } from "@/lib/useUserRole";
import { useToast } from "@/components/common/ToastProvider";
import { SkeletonPanel } from "@/components/common/Skeleton";
import { activeToggleClasses } from "@/lib/statusColors";

interface ProductOption {
  _id: string;
  nom: string;
}

interface LookItem {
  _id: string;
  prix: number | null;
  product_id: {
    _id: string;
    nom: string;
  };
}

interface Look {
  _id: string;
  nom: string;
  prix_pack: number;
  photo_couverture?: string;
  statut: "actif" | "archive";
  items: LookItem[];
}

export default function LookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = params.id as string;
  const { canWrite, isAdmin } = useUserRole();

  const [look, setLook] = useState<Look | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [error, setError] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingArchive, setIsTogglingArchive] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [infoForm, setInfoForm] = useState({ nom: "", prix_pack: "" });

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/looks/${id}`);
      if (res.ok) {
        const data = (await res.json()).data;
        setLook(data);
        setInfoForm({ nom: data.nom, prix_pack: String(data.prix_pack) });
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const session = localStorage.getItem("user");
    if (!session) {
      router.push("/login");
      return;
    }
    load();
    fetch("/api/products?limit=100")
      .then((r) => r.json())
      .then((d) => setProducts(d.data.map((p: { _id: string; nom: string }) => ({ _id: p._id, nom: p.nom }))));
  }, [load, router]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Échec du téléversement");
      await fetch(`/api/looks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo_couverture: data.data.url }),
      });
      load();
    } catch {
      // silencieux : l'utilisateur peut réessayer
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      const res = await fetch(`/api/looks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: infoForm.nom, prix_pack: Number(infoForm.prix_pack) || 0 }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Échec de l'enregistrement");
      toast.success("Look mis à jour");
      setIsEditing(false);
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!look) return;
    const nextStatut = look.statut === "archive" ? "actif" : "archive";
    setIsTogglingArchive(true);
    try {
      const res = await fetch(`/api/looks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: nextStatut }),
      });
      if (!res.ok) throw new Error("Échec de la mise à jour du statut");
      toast.success(nextStatut === "archive" ? "Look archivé" : "Look désarchivé");
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(message);
    } finally {
      setIsTogglingArchive(false);
    }
  };

  const handleDeleteLook = async () => {
    if (!look) return;
    if (!window.confirm(`Supprimer définitivement le look "${look.nom}" ? Cette action est irréversible.`)) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/looks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Échec de la suppression");
      toast.success("Look supprimé");
      router.push("/looks");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(message);
      setIsDeleting(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedProduct) {
      setError("Choisis un produit");
      return;
    }
    const res = await fetch(`/api/looks/${id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: selectedProduct }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setError(data.error || "Erreur lors de l'ajout");
      return;
    }
    setSelectedProduct("");
    setShowAddItem(false);
    load();
  };

  const handleRemoveItem = async (itemId: string) => {
    await fetch(`/api/looks/${id}/items/${itemId}`, { method: "DELETE" });
    load();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <SkeletonPanel lines={5} />
      </div>
    );
  }

  if (!look) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-ink-soft/70 mb-4">Look introuvable.</p>
        <Link href="/looks" className="text-ink underline">Retour aux looks</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-serif text-3xl text-ink">{look.nom}</h1>
        <Link href="/looks" className="px-4 py-2 border border-silver-soft text-ink-soft rounded-lg hover:bg-ivory-soft transition-colors">
          ← Retour
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        {!isEditing ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {look.photo_couverture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={look.photo_couverture} alt={look.nom} className="h-20 w-20 object-cover rounded border border-silver-soft shrink-0" />
            ) : (
              <div className="h-20 w-20 rounded bg-ivory-soft border border-silver-soft shrink-0" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${activeToggleClasses(look.statut === "actif")}`}>
                  {look.statut === "actif" ? "Actif" : "Archivé"}
                </span>
              </div>
              <p className="text-ink-soft/70 text-sm">Prix pack : <span className="font-semibold text-ink">{formatXAF(look.prix_pack)}</span></p>
              {canWrite && (
                <label className="text-xs text-ink underline hover:no-underline cursor-pointer mt-1 inline-block">
                  {isUploadingPhoto ? "Téléversement..." : "Changer la photo"}
                  <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={isUploadingPhoto} className="hidden" />
                </label>
              )}
              {canWrite && (
                <div className="flex gap-3 mt-3">
                  <button type="button" onClick={() => setIsEditing(true)} className="px-4 py-1.5 bg-ink text-ivory rounded-lg text-sm hover:bg-ink-soft transition-colors">
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleArchive}
                    disabled={isTogglingArchive}
                    className="px-4 py-1.5 border border-silver-soft text-ink-soft rounded-lg text-sm hover:bg-ivory-soft transition-colors disabled:opacity-50">
                    {look.statut === "archive" ? "Désarchiver" : "Archiver"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveInfo} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">Nom</label>
              <input required value={infoForm.nom} onChange={(e) => setInfoForm({ ...infoForm, nom: e.target.value })}
                className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">Prix pack</label>
              <input type="number" step="0.01" min="0" required value={infoForm.prix_pack} onChange={(e) => setInfoForm({ ...infoForm, prix_pack: e.target.value })}
                className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
            </div>
            {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={isSaving} className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors disabled:opacity-50">
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button type="button" onClick={() => { setIsEditing(false); setError(""); }} className="px-6 py-2 border border-silver-soft text-ink-soft rounded-lg hover:bg-ivory-soft transition-colors">
                Annuler
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-serif text-xl text-ink">Articles du look</h2>
          {canWrite && !showAddItem && (
            <button type="button" onClick={() => setShowAddItem(true)} className="text-sm text-ink underline hover:no-underline">
              + Ajouter un article
            </button>
          )}
        </div>

        {canWrite && showAddItem && (
          <form onSubmit={handleAddItem} className="grid md:grid-cols-3 gap-4 mb-4 pb-4 border-b border-silver-soft">
            <div className="md:col-span-2">
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
                <option value="">Choisir un produit</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>{p.nom}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
                Ajouter
              </button>
              <button type="button" onClick={() => { setShowAddItem(false); setError(""); }} className="text-sm text-ink-soft underline hover:no-underline">
                Annuler
              </button>
            </div>
            {error && <p className="md:col-span-3 text-sm text-red-600">{error}</p>}
          </form>
        )}

        {look.items.length === 0 ? (
          <p className="text-ink-soft/70 text-sm">Aucun article ajouté pour le moment.</p>
        ) : (
          <ul className="divide-y divide-silver-soft">
            {look.items.map((item) => (
              <li key={item._id} className="flex justify-between items-center py-3 text-sm">
                <div>
                  <p className="font-medium text-ink">{item.product_id.nom}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-ink-soft">
                    {item.prix != null ? formatXAF(item.prix) : "Prix non défini"}
                  </span>
                  {canWrite && (
                    <button onClick={() => handleRemoveItem(item._id)} className="text-red-600 hover:underline text-xs">
                      Retirer
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isAdmin && (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <p className="text-sm font-medium text-red-600 mb-2">Zone dangereuse</p>
          <button
            type="button"
            onClick={handleDeleteLook}
            disabled={isDeleting}
            className="px-6 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
            {isDeleting ? "Suppression..." : "Supprimer le look"}
          </button>
        </div>
      )}
    </div>
  );
}
