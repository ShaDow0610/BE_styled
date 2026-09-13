"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserRole } from "@/lib/useUserRole";
import { useToast } from "@/components/common/ToastProvider";
import { formatXAF } from "@/lib/currency";
import { SkeletonStatCards, SkeletonTable } from "@/components/common/Skeleton";

interface PackagingType {
  _id: string;
  nom: string;
  prix_unitaire: number;
}

interface PackagingPurchase {
  _id: string;
  nom: string;
  quantite: number;
  prix_unitaire: number;
  montant_total: number;
  fournisseur?: string;
  date_achat: string;
  notes?: string;
}

const EMPTY_TYPE_FORM = { nom: "", prix_unitaire: "" };
const EMPTY_PURCHASE_FORM = {
  packaging_id: "",
  nom: "",
  quantite: "1",
  prix_unitaire: "",
  fournisseur: "",
  date_achat: new Date().toISOString().slice(0, 10),
  notes: "",
};

export default function PackagingPage() {
  const router = useRouter();
  const toast = useToast();
  const { canWrite, isAdmin, canSeeFinancials } = useUserRole();

  const [types, setTypes] = useState<PackagingType[]>([]);
  const [purchases, setPurchases] = useState<PackagingPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeForm, setTypeForm] = useState(EMPTY_TYPE_FORM);
  const [isSavingType, setIsSavingType] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState(EMPTY_PURCHASE_FORM);
  const [isSavingPurchase, setIsSavingPurchase] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setIsLoading(true);
    try {
      const [typesRes, purchasesRes] = await Promise.all([
        fetch("/api/packaging"),
        fetch("/api/packaging-purchases"),
      ]);
      if (typesRes.ok) setTypes((await typesRes.json()).data || []);
      if (purchasesRes.ok) setPurchases((await purchasesRes.json()).data || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const session = localStorage.getItem("user");
    if (!session) {
      router.push("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    const nom = typeForm.nom.trim();
    const prix_unitaire = Number(typeForm.prix_unitaire);
    if (!nom || !prix_unitaire || prix_unitaire <= 0) return;
    setIsSavingType(true);
    try {
      const res = await fetch("/api/packaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, prix_unitaire }),
      });
      if (!res.ok) throw new Error("Échec de l'enregistrement");
      toast.success("Type de packaging enregistré");
      setTypeForm(EMPTY_TYPE_FORM);
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(message);
    } finally {
      setIsSavingType(false);
    }
  };

  const handlePickType = (packaging_id: string) => {
    const type = types.find((t) => t._id === packaging_id);
    setPurchaseForm((f) => ({
      ...f,
      packaging_id,
      nom: type?.nom || "",
      prix_unitaire: type ? String(type.prix_unitaire) : f.prix_unitaire,
    }));
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!purchaseForm.nom.trim()) {
      setError("Choisis ou renseigne un type de packaging");
      return;
    }
    setIsSavingPurchase(true);
    try {
      const res = await fetch("/api/packaging-purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...purchaseForm,
          quantite: Number(purchaseForm.quantite) || 1,
          prix_unitaire: Number(purchaseForm.prix_unitaire) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Échec de l'enregistrement");
      }
      toast.success("Achat enregistré");
      setPurchaseForm(EMPTY_PURCHASE_FORM);
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      toast.error(message);
    } finally {
      setIsSavingPurchase(false);
    }
  };

  const handleDeletePurchase = async (id: string) => {
    if (!window.confirm("Supprimer cet achat de l'historique ? Cette action est irréversible.")) return;
    const res = await fetch(`/api/packaging-purchases/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || !data.success) {
      toast.error(data.error || "Échec de la suppression");
      return;
    }
    toast.success("Achat supprimé");
    load();
  };

  const handleDeleteType = async (type: PackagingType) => {
    if (!window.confirm(`Supprimer définitivement le type "${type.nom}" ? L'historique des achats déjà enregistrés est conservé. Cette action est irréversible.`)) return;
    const res = await fetch(`/api/packaging/${type._id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || !data.success) {
      toast.error(data.error || "Échec de la suppression");
      return;
    }
    toast.success("Type de packaging supprimé");
    load();
  };

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const totalGeneral = purchases.reduce((sum, p) => sum + p.montant_total, 0);
  const total30j = purchases
    .filter((p) => new Date(p.date_achat).getTime() >= thirtyDaysAgo)
    .reduce((sum, p) => sum + p.montant_total, 0);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <SkeletonStatCards count={2} />
        <SkeletonTable rows={4} cols={2} />
        <SkeletonTable rows={5} cols={6} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-serif text-3xl text-ink mb-8">Packaging</h1>

      {canSeeFinancials && (
        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-ink-soft/70">Dépensé (30 derniers jours)</p>
            <p className="text-2xl font-bold text-ink">{formatXAF(total30j)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-ink-soft/70">Dépensé au total</p>
            <p className="text-2xl font-bold text-ink">{formatXAF(totalGeneral)}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="font-serif text-xl text-ink mb-4">Types de packaging</h2>
        <div className="overflow-x-auto mb-4">
          {types.length === 0 ? (
            <p className="text-ink-soft/70 text-sm">Aucun type enregistré pour le moment.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-soft/70 border-b border-silver-soft">
                  <th className="py-2 pr-4">Nom</th>
                  {canSeeFinancials && <th className="py-2 pr-4">Prix unitaire de référence</th>}
                  {isAdmin && <th className="py-2 pr-4"></th>}
                </tr>
              </thead>
              <tbody>
                {types.map((t) => (
                  <tr key={t._id} className="border-b border-silver-soft/50">
                    <td className="py-2 pr-4 text-ink">{t.nom}</td>
                    {canSeeFinancials && <td className="py-2 pr-4 text-ink-soft">{formatXAF(t.prix_unitaire)}</td>}
                    {isAdmin && (
                      <td className="py-2 pr-4">
                        <button onClick={() => handleDeleteType(t)} className="text-red-600 hover:underline text-xs">
                          Supprimer
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {canWrite && (
          <form onSubmit={handleSaveType} className="flex flex-wrap gap-3 items-end pt-4 border-t border-silver-soft">
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">Nom</label>
              <input
                value={typeForm.nom}
                onChange={(e) => setTypeForm({ ...typeForm, nom: e.target.value })}
                placeholder="Ex: boîte cadeau"
                className="px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">Prix unitaire de référence</label>
              <input
                type="number" step="0.01" min="0"
                value={typeForm.prix_unitaire}
                onChange={(e) => setTypeForm({ ...typeForm, prix_unitaire: e.target.value })}
                className="px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
              />
            </div>
            <button
              type="submit"
              disabled={isSavingType}
              className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors disabled:opacity-50">
              {isSavingType ? "Enregistrement..." : "Ajouter / mettre à jour"}
            </button>
          </form>
        )}
      </div>

      {canWrite && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="font-serif text-xl text-ink mb-4">Enregistrer un achat</h2>
          <form onSubmit={handleSavePurchase} className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">Type de packaging</label>
              <select
                value={purchaseForm.packaging_id}
                onChange={(e) => handlePickType(e.target.value)}
                className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
                <option value="">Choisir un type existant...</option>
                {types.map((t) => (
                  <option key={t._id} value={t._id}>{t.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">Nom (si non listé ci-dessus)</label>
              <input
                value={purchaseForm.nom}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, nom: e.target.value, packaging_id: "" })}
                className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">Fournisseur (optionnel)</label>
              <input
                value={purchaseForm.fournisseur}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, fournisseur: e.target.value })}
                className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">Quantité</label>
              <input
                type="number" min="1"
                value={purchaseForm.quantite}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, quantite: e.target.value })}
                className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">Prix unitaire payé</label>
              <input
                type="number" step="0.01" min="0"
                value={purchaseForm.prix_unitaire}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, prix_unitaire: e.target.value })}
                className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">Date d'achat</label>
              <input
                type="date"
                value={purchaseForm.date_achat}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, date_achat: e.target.value })}
                className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-ink-soft mb-2">Notes (optionnel)</label>
              <input
                value={purchaseForm.notes}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
              />
            </div>
            {error && <p className="md:col-span-3 text-sm text-red-600">{error}</p>}
            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={isSavingPurchase}
                className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors disabled:opacity-50">
                {isSavingPurchase ? "Enregistrement..." : "Enregistrer l'achat"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-serif text-xl text-ink mb-4">Historique des achats</h2>
        {purchases.length === 0 ? (
          <p className="text-ink-soft/70 text-sm">Aucun achat enregistré pour le moment.</p>
        ) : (
          <>
            {/* Mobile : une carte par achat */}
            <div className="sm:hidden space-y-3">
              {purchases.map((p) => (
                <div key={p._id} className="border border-silver-soft rounded-lg p-3">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <p className="font-medium text-ink">{p.nom}</p>
                    <p className="text-xs text-ink-soft/70 whitespace-nowrap">
                      {new Date(p.date_achat).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <p className="text-xs text-ink-soft">
                    {p.fournisseur || "Sans fournisseur"} · Qté {p.quantite}
                  </p>
                  {canSeeFinancials && (
                    <p className="text-sm font-semibold text-ink mt-1">
                      {formatXAF(p.montant_total)} <span className="text-xs font-normal text-ink-soft/60">({formatXAF(p.prix_unitaire)}/u)</span>
                    </p>
                  )}
                  {isAdmin && (
                    <button onClick={() => handleDeletePurchase(p._id)} className="text-red-600 hover:underline text-xs mt-2">
                      Supprimer
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop/tablette : tableau */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-soft/70 border-b border-silver-soft">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Fournisseur</th>
                    <th className="py-2 pr-4">Quantité</th>
                    {canSeeFinancials && <th className="py-2 pr-4">Prix unitaire</th>}
                    {canSeeFinancials && <th className="py-2 pr-4">Montant</th>}
                    {isAdmin && <th className="py-2 pr-4"></th>}
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr key={p._id} className="border-b border-silver-soft/50">
                      <td className="py-2 pr-4 text-ink-soft">{new Date(p.date_achat).toLocaleDateString("fr-FR")}</td>
                      <td className="py-2 pr-4 text-ink">{p.nom}</td>
                      <td className="py-2 pr-4 text-ink-soft">{p.fournisseur || "—"}</td>
                      <td className="py-2 pr-4 text-ink-soft">{p.quantite}</td>
                      {canSeeFinancials && <td className="py-2 pr-4 text-ink-soft">{formatXAF(p.prix_unitaire)}</td>}
                      {canSeeFinancials && <td className="py-2 pr-4 font-semibold text-ink">{formatXAF(p.montant_total)}</td>}
                      {isAdmin && (
                        <td className="py-2 pr-4">
                          <button onClick={() => handleDeletePurchase(p._id)} className="text-red-600 hover:underline text-xs">
                            Supprimer
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
