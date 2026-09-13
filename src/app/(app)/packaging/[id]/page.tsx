"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatXAF } from "@/lib/currency";
import { useUserRole } from "@/lib/useUserRole";
import { useToast } from "@/components/common/ToastProvider";
import { SkeletonPanel } from "@/components/common/Skeleton";

interface Purchase {
  _id: string;
  nom: string;
  quantite: number;
  prix_unitaire: number;
  montant_total: number;
  fournisseur?: string;
  date_achat: string;
  notes?: string;
}

export default function PackagingPurchaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = params.id as string;
  const { canWrite, isAdmin, canSeeFinancials } = useUserRole();

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nom: "",
    fournisseur: "",
    quantite: "1",
    prix_unitaire: "",
    date_achat: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/packaging-purchases/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setPurchase(data.data);
        setForm({
          nom: data.data.nom,
          fournisseur: data.data.fournisseur || "",
          quantite: String(data.data.quantite),
          prix_unitaire: String(data.data.prix_unitaire),
          date_achat: data.data.date_achat.slice(0, 10),
          notes: data.data.notes || "",
        });
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
  }, [load, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      const res = await fetch(`/api/packaging-purchases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          quantite: Number(form.quantite) || 1,
          prix_unitaire: Number(form.prix_unitaire) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Échec de l'enregistrement");
      toast.success("Achat mis à jour");
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

  const handleDelete = async () => {
    if (!purchase) return;
    if (!window.confirm(`Supprimer définitivement cet achat de "${purchase.nom}" ? Cette action est irréversible.`)) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/packaging-purchases/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Échec de la suppression");
      toast.success("Achat supprimé");
      router.push("/packaging");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(message);
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <SkeletonPanel lines={5} />
      </div>
    );
  }

  if (notFound || !purchase) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-ink-soft/70 mb-4">Achat introuvable.</p>
        <Link href="/packaging" className="text-ink underline">Retour au packaging</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-serif text-3xl text-ink">{purchase.nom}</h1>
        <Link href="/packaging" className="px-4 py-2 border border-silver-soft text-ink-soft rounded-lg hover:bg-ivory-soft transition-colors">
          ← Retour
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {!isEditing ? (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-soft/60">Type</p>
                <p className="text-ink">{purchase.nom}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-soft/60">Fournisseur</p>
                <p className="text-ink">{purchase.fournisseur || "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-soft/60">Date d&apos;achat</p>
                <p className="text-ink">{new Date(purchase.date_achat).toLocaleDateString("fr-FR")}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-soft/60">Quantité</p>
                <p className="text-ink">{purchase.quantite}</p>
              </div>
              {canSeeFinancials && (
                <>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-ink-soft/60">Prix unitaire</p>
                    <p className="text-ink">{formatXAF(purchase.prix_unitaire)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-ink-soft/60">Montant total</p>
                    <p className="text-ink font-semibold">{formatXAF(purchase.montant_total)}</p>
                  </div>
                </>
              )}
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-ink-soft/60">Notes</p>
                <p className="text-ink whitespace-pre-wrap">{purchase.notes || "—"}</p>
              </div>
            </div>
            {canWrite && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="mt-6 px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
                Modifier
              </button>
            )}
          </>
        ) : (
          <form onSubmit={handleSave} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">Type</label>
              <input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })}
                className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">Fournisseur</label>
              <input value={form.fournisseur} onChange={(e) => setForm({ ...form, fournisseur: e.target.value })}
                className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">Date d&apos;achat</label>
              <input type="date" value={form.date_achat} onChange={(e) => setForm({ ...form, date_achat: e.target.value })}
                className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">Quantité</label>
              <input type="number" min="1" value={form.quantite} onChange={(e) => setForm({ ...form, quantite: e.target.value })}
                className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">Prix unitaire</label>
              <input type="number" step="0.01" min="0" value={form.prix_unitaire} onChange={(e) => setForm({ ...form, prix_unitaire: e.target.value })}
                className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-ink-soft mb-2">Notes</label>
              <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
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

      {isAdmin && (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <p className="text-sm font-medium text-red-600 mb-2">Zone dangereuse</p>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-6 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
            {isDeleting ? "Suppression..." : "Supprimer cet achat"}
          </button>
        </div>
      )}
    </div>
  );
}
