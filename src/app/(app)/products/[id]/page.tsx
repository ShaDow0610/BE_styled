"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useUserRole } from "@/lib/useUserRole";
import { useToast } from "@/components/common/ToastProvider";
import EditableSelect from "@/components/common/EditableSelect";
import EditableMultiSelect from "@/components/common/EditableMultiSelect";
import PackagingSelect from "@/components/common/PackagingSelect";
import { formatXAF } from "@/lib/currency";

const CATEGORIES = [
  "pantalon", "chemise", "tricot", "culotte", "bracelet",
  "montre", "chaussure", "bague", "chapeau", "lunette", "autre",
];
const STATUTS = [
  "brouillon", "en_commande", "en_transit", "en_confection",
  "disponible", "rupture", "archive",
];
const DEVISES = ["CNY", "USD", "XAF"];
const MODES_TRANSPORT = ["avion", "bateau", "local"];
const IMAGE_TYPES = ["porte", "detail_tissu", "etiquette", "packshot"];

interface Product {
  _id: string;
  nom: string;
  reference: string;
  categorie: string;
  origine: string;
  description: string;
  marque_partenaire_id?: string | null;
  fournisseur_id?: string | null;
  matiere?: string;
  poids_kg: number;
  statut: string;
}

interface Variant {
  _id: string;
  taille: string;
  couleur: string;
  modele?: string;
  stock_quantite: number;
  seuil_alerte: number;
  sku_variante: string;
}

interface Pricing {
  _id: string;
  modele?: string;
  date_effet: string;
  cout_achat: number;
  devise_achat: string;
  taux_change_applique: number;
  cout_transport: number;
  mode_transport: string;
  delai_estime_jours: number;
  cout_douane: number;
  cout_packaging: number;
  cout_main_oeuvre: number;
  marge_pourcentage: number;
  prix_revient_total: number;
  prix_revente_final: number;
  raison_changement?: string;
}

interface ImageItem {
  _id: string;
  url: string;
  type: string;
  ordre_affichage: number;
}

interface RefOption {
  _id: string;
  nom: string;
}

type Tab = "infos" | "prix" | "variantes" | "images";

const TABS: { key: Tab; label: string }[] = [
  { key: "infos", label: "Infos générales" },
  { key: "prix", label: "Prix" },
  { key: "variantes", label: "Variantes" },
  { key: "images", label: "Images" },
];

export default function ProductDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink"></div>
        </div>
      }>
      <ProductDetailPageInner />
    </Suspense>
  );
}

function ProductDetailPageInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const { canWrite, canSeeFinancials, isAdmin } = useUserRole();

  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(
    initialTab === "prix" || initialTab === "variantes" || initialTab === "images" ? initialTab : "infos"
  );
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [pricingHistory, setPricingHistory] = useState<Pricing[]>([]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [brands, setBrands] = useState<RefOption[]>([]);
  const [suppliers, setSuppliers] = useState<RefOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [productRes, brandsRes, suppliersRes] = await Promise.all([
        fetch(`/api/products/${id}`),
        fetch("/api/brands"),
        fetch("/api/suppliers"),
      ]);

      if (productRes.status === 404) {
        setNotFound(true);
        return;
      }

      const productData = await productRes.json();
      setProduct(productData.data);
      setVariants(productData.data.variants || []);
      setPricingHistory(productData.data.pricingHistory || []);
      setImages(productData.data.images || []);

      if (brandsRes.ok) setBrands((await brandsRes.json()).data);
      if (suppliersRes.ok) setSuppliers((await suppliersRes.json()).data);
    } catch (error) {
      console.error("Error loading product:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    load();
  }, [load, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink"></div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-ink-soft/70 mb-4">Produit introuvable.</p>
        <Link href="/products" className="text-ink underline">
          Retour aux produits
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl text-ink">{product.nom}</h1>
          <p className="text-ink-soft/70 text-sm">Réf: {product.reference}</p>
        </div>
        <Link
          href="/products"
          className="px-4 py-2 border border-silver-soft text-ink-soft rounded-lg hover:bg-ivory-soft transition-colors">
          ← Retour
        </Link>
      </div>

      <div className="flex gap-2 border-b border-silver-soft mb-6">
        {TABS.filter((t) => t.key !== "prix" || canSeeFinancials).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-ink text-ink"
                : "border-transparent text-ink-soft/60 hover:text-ink-soft"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "infos" && (
        <InfosTab product={product} brands={brands} suppliers={suppliers} onSaved={load} canWrite={canWrite} isAdmin={isAdmin} />
      )}
      {tab === "prix" && canSeeFinancials && (
        <PrixTab productId={id} history={pricingHistory} variants={variants} onSaved={load} canWrite={canWrite} />
      )}
      {tab === "variantes" && (
        <VariantesTab productId={id} variants={variants} onSaved={load} canWrite={canWrite} />
      )}
      {tab === "images" && (
        <ImagesTab productId={id} images={images} onSaved={load} canWrite={canWrite} />
      )}
    </div>
  );
}

function InfosTab({
  product,
  brands,
  suppliers,
  onSaved,
  canWrite,
  isAdmin,
}: {
  product: Product;
  brands: RefOption[];
  suppliers: RefOption[];
  onSaved: () => void;
  canWrite: boolean;
  isAdmin: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    nom: product.nom,
    categorie: product.categorie,
    origine: product.origine,
    description: product.description || "",
    matiere: product.matiere || "",
    poids_kg: String(product.poids_kg ?? 0),
    statut: product.statut,
    marque_partenaire_id: product.marque_partenaire_id || "",
    fournisseur_id: product.fournisseur_id || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleCancel = () => {
    setForm({
      nom: product.nom,
      categorie: product.categorie,
      origine: product.origine,
      description: product.description || "",
      matiere: product.matiere || "",
      poids_kg: String(product.poids_kg ?? 0),
      statut: product.statut,
      marque_partenaire_id: product.marque_partenaire_id || "",
      fournisseur_id: product.fournisseur_id || "",
    });
    setError("");
    setIsEditing(false);
  };

  const handleOrigineChange = (origine: string) => {
    setForm((f) => ({ ...f, origine, poids_kg: origine === "import_chine" ? f.poids_kg : "0" }));
  };

  const handleDelete = async () => {
    if (!window.confirm(`Supprimer définitivement "${product.nom}" ? Cette action supprime aussi ses variantes, prix et images. Elle est irréversible.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${product._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Échec de la suppression");
      toast.success("Produit supprimé");
      router.push("/products");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(message);
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/products/${product._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          poids_kg: Number(form.poids_kg) || 0,
          marque_partenaire_id: form.marque_partenaire_id || null,
          fournisseur_id: form.fournisseur_id || null,
        }),
      });
      if (!res.ok) throw new Error("Échec de la sauvegarde");
      toast.success("Informations enregistrées");
      setIsEditing(false);
      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing) {
    const brandName = brands.find((b) => b._id === product.marque_partenaire_id)?.nom;
    const supplierName = suppliers.find((s) => s._id === product.fournisseur_id)?.nom;
    const rows: [string, string][] = [
      ["Nom", product.nom],
      ["Statut", product.statut],
      ["Catégorie", product.categorie],
      ["Origine", product.origine === "import_chine" ? "Import Chine" : "Local"],
      ...(product.origine === "import_chine" ? ([["Poids", `${product.poids_kg ?? 0} kg`]] as [string, string][]) : []),
      ["Marque partenaire", brandName || "Aucune"],
      ["Fournisseur", supplierName || "Aucun"],
      ["Matière / tissu", product.matiere || "—"],
    ];
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid md:grid-cols-2 gap-4">
          {rows.map(([label, value]) => (
            <div key={label}>
              <p className="text-xs uppercase tracking-wide text-ink-soft/60">{label}</p>
              <p className="text-ink capitalize">{value}</p>
            </div>
          ))}
          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-wide text-ink-soft/60">Description</p>
            <p className="text-ink whitespace-pre-wrap">{product.description || "—"}</p>
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
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 grid md:grid-cols-2 gap-4">
      <fieldset disabled={!canWrite} className="contents">
      <div>
        <label className="block text-sm font-medium text-ink-soft mb-2">Nom</label>
        <input
          value={form.nom}
          onChange={(e) => setForm({ ...form, nom: e.target.value })}
          className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink-soft mb-2">Statut</label>
        <select
          value={form.statut}
          onChange={(e) => setForm({ ...form, statut: e.target.value })}
          className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
          {STATUTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-ink-soft mb-2">Catégorie</label>
        <select
          value={form.categorie}
          onChange={(e) => setForm({ ...form, categorie: e.target.value })}
          className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-ink-soft mb-2">Origine</label>
        <select
          value={form.origine}
          onChange={(e) => handleOrigineChange(e.target.value)}
          className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
          <option value="import_chine">Import Chine</option>
          <option value="local">Local</option>
        </select>
      </div>
      {form.origine === "import_chine" && (
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-2">Poids (kg)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.poids_kg}
            onChange={(e) => setForm({ ...form, poids_kg: e.target.value })}
            className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
          />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-ink-soft mb-2">Marque partenaire</label>
        <select
          value={form.marque_partenaire_id}
          onChange={(e) => setForm({ ...form, marque_partenaire_id: e.target.value })}
          className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
          <option value="">Aucune</option>
          {brands.map((b) => (
            <option key={b._id} value={b._id}>{b.nom}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-ink-soft mb-2">Fournisseur</label>
        <select
          value={form.fournisseur_id}
          onChange={(e) => setForm({ ...form, fournisseur_id: e.target.value })}
          className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
          <option value="">Aucun</option>
          {suppliers.map((s) => (
            <option key={s._id} value={s._id}>{s.nom}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-ink-soft mb-2">Matière / tissu</label>
        <EditableSelect
          type="matiere"
          value={form.matiere}
          onChange={(v) => setForm({ ...form, matiere: v })}
          placeholder="Choisir une matière..."
        />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-ink-soft mb-2">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={4}
          className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
        />
      </div>
      {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
      </fieldset>
      {canWrite && (
        <div className="md:col-span-2 flex gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors disabled:opacity-50">
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 border border-silver-soft text-ink-soft rounded-lg hover:bg-ivory-soft transition-colors">
            Annuler
          </button>
        </div>
      )}
      {isAdmin && (
        <div className="md:col-span-2 mt-4 pt-4 border-t border-silver-soft">
          <p className="text-sm font-medium text-red-600 mb-2">Zone dangereuse</p>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-6 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
            {isDeleting ? "Suppression..." : "Supprimer le produit"}
          </button>
        </div>
      )}
    </form>
  );
}

const PRICING_FORM_DEFAULTS = {
  modele: "",
  cout_achat: "",
  devise_achat: "CNY",
  taux_change_applique: "1",
  mode_transport: "bateau",
  delai_estime_jours: "0",
  marge_pourcentage: "30",
  prix_revente_final: "",
  raison_changement: "",
};

const COST_TOGGLE_DEFAULTS = {
  cout_transport: { actif: false, valeur: "" },
  cout_douane: { actif: false, valeur: "" },
  cout_packaging: { actif: false, valeur: "" },
  cout_main_oeuvre: { actif: false, valeur: "" },
};

type CostKey = keyof typeof COST_TOGGLE_DEFAULTS;
const COST_LABELS: Record<CostKey, string> = {
  cout_transport: "Coût transport",
  cout_douane: "Coût douane",
  cout_packaging: "Coût packaging",
  cout_main_oeuvre: "Coût main-d'œuvre",
};

function PrixTab({
  productId,
  history,
  variants,
  onSaved,
  canWrite,
}: {
  productId: string;
  history: Pricing[];
  variants: Variant[];
  onSaved: () => void;
  canWrite: boolean;
}) {
  const toast = useToast();
  const modeles = Array.from(new Set(variants.map((v) => v.modele).filter((m): m is string => !!m)));
  const [form, setForm] = useState(PRICING_FORM_DEFAULTS);
  const [costs, setCosts] = useState(COST_TOGGLE_DEFAULTS);
  const [priceMode, setPriceMode] = useState<"marge" | "prix">("marge");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [preview, setPreview] = useState<{ prix_revient_total: number; prix_revente_final: number; marge_pourcentage: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const costValue = (key: CostKey) => (costs[key].actif ? Number(costs[key].valeur) || 0 : 0);

  useEffect(() => {
    const coutAchat = Number(form.cout_achat);
    const taux = Number(form.taux_change_applique);
    const marge = Number(form.marge_pourcentage);
    const prixVente = Number(form.prix_revente_final);
    if (!coutAchat || !taux) {
      setPreview(null);
      return;
    }
    if (priceMode === "marge" && Number.isNaN(marge)) {
      setPreview(null);
      return;
    }
    if (priceMode === "prix" && !prixVente) {
      setPreview(null);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch("/api/pricing/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            cout_achat: coutAchat,
            taux_change_applique: taux,
            cout_transport: costValue("cout_transport"),
            cout_douane: costValue("cout_douane"),
            cout_packaging: costValue("cout_packaging"),
            cout_main_oeuvre: costValue("cout_main_oeuvre"),
            ...(priceMode === "marge" ? { marge_pourcentage: marge } : { prix_revente_final: prixVente }),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setPreview(data.data);
        }
      } catch {
        // ignoré : requête annulée par le debounce suivant
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, costs, priceMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/products/${productId}/pricing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modele: form.modele || undefined,
          cout_achat: Number(form.cout_achat),
          devise_achat: form.devise_achat,
          taux_change_applique: Number(form.taux_change_applique),
          mode_transport: form.mode_transport,
          delai_estime_jours: Number(form.delai_estime_jours) || 0,
          cout_transport: costValue("cout_transport"),
          cout_douane: costValue("cout_douane"),
          cout_packaging: costValue("cout_packaging"),
          cout_main_oeuvre: costValue("cout_main_oeuvre"),
          ...(priceMode === "marge"
            ? { marge_pourcentage: Number(form.marge_pourcentage) }
            : { prix_revente_final: Number(form.prix_revente_final) }),
          raison_changement: form.raison_changement || undefined,
        }),
      });
      if (!res.ok) throw new Error("Échec de l'enregistrement du prix");
      setForm(PRICING_FORM_DEFAULTS);
      setCosts(COST_TOGGLE_DEFAULTS);
      toast.success("Prix enregistré");
      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {canWrite && (
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        <h2 className="font-serif text-xl text-ink mb-4">Calculateur de prix</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {modeles.length > 0 && (
            <Field label="Modèle concerné">
              <select
                value={form.modele}
                onChange={(e) => setForm({ ...form, modele: e.target.value })}
                className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
                <option value="">Tous modèles (prix par défaut)</option>
                {modeles.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
          )}
          <Field label="Coût achat">
            <input
              type="number" step="0.01" min="0" required
              value={form.cout_achat}
              onChange={(e) => setForm({ ...form, cout_achat: e.target.value })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
            />
          </Field>
          <Field label="Devise">
            <select
              value={form.devise_achat}
              onChange={(e) => setForm({ ...form, devise_achat: e.target.value })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
              {DEVISES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Taux de change appliqué">
            <input
              type="number" step="0.0001" min="0" required
              value={form.taux_change_applique}
              onChange={(e) => setForm({ ...form, taux_change_applique: e.target.value })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
            />
          </Field>

          <Field label={priceMode === "marge" ? "Marge (%)" : "Prix de vente (FCFA)"}>
            <div className="flex gap-2">
              <div className="flex border border-silver-soft rounded-lg overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => setPriceMode("marge")}
                  className={`px-3 py-2 text-sm ${priceMode === "marge" ? "bg-ink text-ivory" : "text-ink-soft"}`}>
                  Marge %
                </button>
                <button
                  type="button"
                  onClick={() => setPriceMode("prix")}
                  className={`px-3 py-2 text-sm ${priceMode === "prix" ? "bg-ink text-ivory" : "text-ink-soft"}`}>
                  Prix FCFA
                </button>
              </div>
              {priceMode === "marge" ? (
                <input
                  type="number" step="0.1" min="0" required
                  value={form.marge_pourcentage}
                  onChange={(e) => setForm({ ...form, marge_pourcentage: e.target.value })}
                  className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
                />
              ) : (
                <input
                  type="number" step="0.01" min="0" required
                  value={form.prix_revente_final}
                  onChange={(e) => setForm({ ...form, prix_revente_final: e.target.value })}
                  className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
                />
              )}
            </div>
          </Field>

          {showAdvanced && (
            <>
              <Field label="Mode de transport">
                <select
                  value={form.mode_transport}
                  onChange={(e) => setForm({ ...form, mode_transport: e.target.value })}
                  className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
                  {MODES_TRANSPORT.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Délai estimé (jours)">
                <input
                  type="number" min="0"
                  value={form.delai_estime_jours}
                  onChange={(e) => setForm({ ...form, delai_estime_jours: e.target.value })}
                  className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
                />
              </Field>

              {(Object.keys(COST_TOGGLE_DEFAULTS) as CostKey[]).map((key) => (
                <Field key={key} label={COST_LABELS[key]}>
                  <div className={key === "cout_packaging" && costs[key].actif ? "space-y-2" : "flex gap-2"}>
                    <div className="flex border border-silver-soft rounded-lg overflow-hidden shrink-0 w-fit">
                      <button
                        type="button"
                        onClick={() => setCosts({ ...costs, [key]: { actif: false, valeur: "" } })}
                        className={`px-3 py-2 text-sm ${!costs[key].actif ? "bg-ink text-ivory" : "text-ink-soft"}`}>
                        Non
                      </button>
                      <button
                        type="button"
                        onClick={() => setCosts({ ...costs, [key]: { ...costs[key], actif: true } })}
                        className={`px-3 py-2 text-sm ${costs[key].actif ? "bg-ink text-ivory" : "text-ink-soft"}`}>
                        Oui
                      </button>
                    </div>
                    {costs[key].actif && key === "cout_packaging" && (
                      <PackagingSelect
                        onTotalChange={(total) => setCosts((c) => ({ ...c, cout_packaging: { actif: true, valeur: String(total) } }))}
                      />
                    )}
                    {costs[key].actif && key !== "cout_packaging" && (
                      <input
                        type="number" step="0.01" min="0" autoFocus
                        value={costs[key].valeur}
                        onChange={(e) => setCosts({ ...costs, [key]: { ...costs[key], valeur: e.target.value } })}
                        className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
                      />
                    )}
                  </div>
                </Field>
              ))}

              <div className="md:col-span-3">
                <Field label="Raison du changement (optionnel)">
                  <input
                    value={form.raison_changement}
                    onChange={(e) => setForm({ ...form, raison_changement: e.target.value })}
                    placeholder='Ex: "hausse fret", "nouveau fournisseur"'
                    className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
                  />
                </Field>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="mt-4 text-sm text-ink-soft underline hover:no-underline">
          {showAdvanced ? "Masquer les détails avancés" : "Afficher les détails avancés"}
        </button>

        {preview && (
          <div className="mt-4 bg-ivory-soft rounded-lg p-4 flex gap-8">
            <div>
              <p className="text-xs text-ink-soft/70">Prix de revient total</p>
              <p className="text-2xl font-bold text-ink">{formatXAF(preview.prix_revient_total)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-soft/70">{priceMode === "marge" ? "Prix de revente final" : "Marge"}</p>
              <p className="text-2xl font-bold text-ink">
                {priceMode === "marge" ? formatXAF(preview.prix_revente_final) : `${preview.marge_pourcentage}%`}
              </p>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

        <button
          type="submit"
          disabled={isSaving}
          className="mt-4 px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors disabled:opacity-50">
          {isSaving ? "Enregistrement..." : "Enregistrer ce prix"}
        </button>
      </form>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-serif text-xl text-ink mb-4">Historique</h2>
        {history.length === 0 ? (
          <p className="text-ink-soft/70 text-sm">Aucun prix enregistré pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-soft/70 border-b border-silver-soft">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Modèle</th>
                  <th className="py-2 pr-4">Revient</th>
                  <th className="py-2 pr-4">Marge</th>
                  <th className="py-2 pr-4">Revente</th>
                  <th className="py-2 pr-4">Raison</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h._id} className="border-b border-silver-soft/50">
                    <td className="py-2 pr-4 text-ink-soft">
                      {new Date(h.date_effet).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="py-2 pr-4 text-ink-soft">{h.modele || "Défaut"}</td>
                    <td className="py-2 pr-4 text-ink">{formatXAF(h.prix_revient_total)}</td>
                    <td className="py-2 pr-4 text-ink">{h.marge_pourcentage}%</td>
                    <td className="py-2 pr-4 font-semibold text-ink">{formatXAF(h.prix_revente_final)}</td>
                    <td className="py-2 pr-4 text-ink-soft/70">{h.raison_changement || "—"}</td>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink-soft mb-2">{label}</label>
      {children}
    </div>
  );
}

const VARIANT_FORM_DEFAULTS = { modele: "", stock_quantite: "0", seuil_alerte: "5" };

function VariantesTab({
  productId,
  variants,
  onSaved,
  canWrite,
}: {
  productId: string;
  variants: Variant[];
  onSaved: () => void;
  canWrite: boolean;
}) {
  const toast = useToast();
  const [form, setForm] = useState(VARIANT_FORM_DEFAULTS);
  const [tailles, setTailles] = useState<string[]>([]);
  const [couleurs, setCouleurs] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (tailles.length === 0 || couleurs.length === 0) {
      setError("Choisis au moins une taille et une couleur");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          tailles,
          couleurs,
          stock_quantite: Number(form.stock_quantite) || 0,
          seuil_alerte: Number(form.seuil_alerte) || 0,
        }),
      });
      if (!res.ok) throw new Error("Échec de la création des variantes");
      setForm(VARIANT_FORM_DEFAULTS);
      setTailles([]);
      setCouleurs([]);
      const count = tailles.length * couleurs.length;
      toast.success(count > 1 ? `${count} variantes ajoutées` : "Variante ajoutée");
      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (variantId: string) => {
    await fetch(`/api/products/${productId}/variants/${variantId}`, { method: "DELETE" });
    toast.success("Variante supprimée");
    onSaved();
  };

  const combosCount = tailles.length * couleurs.length;

  return (
    <div className="space-y-6">
      {canWrite && (
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <Field label="Modèle (optionnel)">
          <input value={form.modele} onChange={(e) => setForm({ ...form, modele: e.target.value })}
            placeholder="Ex: Croisé"
            className="w-full max-w-sm px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
        </Field>
        <Field label="Tailles disponibles pour ce modèle">
          <EditableMultiSelect type="taille" values={tailles} onChange={setTailles} />
        </Field>
        <Field label="Couleurs disponibles pour ce modèle">
          <EditableMultiSelect type="couleur" values={couleurs} onChange={setCouleurs} />
        </Field>
        <div className="grid md:grid-cols-2 gap-4 max-w-md">
          <Field label="Stock initial (par variante)">
            <input type="number" min="0" value={form.stock_quantite} onChange={(e) => setForm({ ...form, stock_quantite: e.target.value })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
          </Field>
          <Field label="Seuil d'alerte">
            <input type="number" min="0" value={form.seuil_alerte} onChange={(e) => setForm({ ...form, seuil_alerte: e.target.value })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
          </Field>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <button type="submit" disabled={isSaving || combosCount === 0}
            className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors disabled:opacity-50">
            {isSaving
              ? "Ajout..."
              : combosCount > 1
                ? `Ajouter les ${combosCount} variantes`
                : "Ajouter la variante"}
          </button>
        </div>
      </form>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-serif text-xl text-ink mb-4">Variantes existantes</h2>
        {variants.length === 0 ? (
          <p className="text-ink-soft/70 text-sm">Aucune variante pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-soft/70 border-b border-silver-soft">
                  <th className="py-2 pr-4">SKU</th>
                  <th className="py-2 pr-4">Modèle</th>
                  <th className="py-2 pr-4">Taille</th>
                  <th className="py-2 pr-4">Couleur</th>
                  <th className="py-2 pr-4">Stock</th>
                  <th className="py-2 pr-4">Seuil</th>
                  {canWrite && <th className="py-2 pr-4"></th>}
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v._id} className="border-b border-silver-soft/50">
                    <td className="py-2 pr-4 text-ink">{v.sku_variante}</td>
                    <td className="py-2 pr-4 text-ink-soft">{v.modele || "—"}</td>
                    <td className="py-2 pr-4 text-ink-soft">{v.taille}</td>
                    <td className="py-2 pr-4 text-ink-soft">{v.couleur}</td>
                    <td className={`py-2 pr-4 font-medium ${v.stock_quantite <= v.seuil_alerte ? "text-red-600" : "text-ink"}`}>
                      {v.stock_quantite}
                    </td>
                    <td className="py-2 pr-4 text-ink-soft/70">{v.seuil_alerte}</td>
                    {canWrite && (
                      <td className="py-2 pr-4">
                        <button onClick={() => handleDelete(v._id)} className="text-red-600 hover:underline text-xs">
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

const IMAGE_FORM_DEFAULTS = { url: "", type: IMAGE_TYPES[0], ordre_affichage: "0" };

function ImagesTab({
  productId,
  images,
  onSaved,
  canWrite,
}: {
  productId: string;
  images: ImageItem[];
  onSaved: () => void;
  canWrite: boolean;
}) {
  const toast = useToast();
  const [form, setForm] = useState(IMAGE_FORM_DEFAULTS);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setIsUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Échec du téléversement");
      }
      setForm((f) => ({ ...f, url: data.data.url }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/products/${productId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ordre_affichage: Number(form.ordre_affichage) || 0 }),
      });
      if (!res.ok) throw new Error("Échec de l'ajout de l'image");
      setForm(IMAGE_FORM_DEFAULTS);
      toast.success("Image ajoutée");
      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    await fetch(`/api/products/${productId}/images?imageId=${imageId}`, { method: "DELETE" });
    toast.success("Image supprimée");
    onSaved();
  };

  return (
    <div className="space-y-6">
      {canWrite && (
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 grid md:grid-cols-3 gap-4">
        <Field label="Photo">
          <input type="file" accept="image/*" onChange={handleFileChange}
            className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink file:mr-3 file:px-3 file:py-1 file:rounded file:border-0 file:bg-ink file:text-ivory file:text-sm" />
          {isUploading && <p className="text-xs text-ink-soft/70 mt-1">Téléversement...</p>}
          {form.url && !isUploading && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.url} alt="Aperçu" className="mt-2 h-16 w-16 object-cover rounded border border-silver-soft" />
          )}
        </Field>
        <Field label="Type">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
            {IMAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Ordre d'affichage">
          <input type="number" min="0" value={form.ordre_affichage} onChange={(e) => setForm({ ...form, ordre_affichage: e.target.value })}
            className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
        </Field>
        {error && <p className="md:col-span-3 text-sm text-red-600">{error}</p>}
        <div className="md:col-span-3">
          <button type="submit" disabled={isSaving || isUploading || !form.url}
            className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors disabled:opacity-50">
            {isSaving ? "Ajout..." : "Ajouter l'image"}
          </button>
        </div>
      </form>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-serif text-xl text-ink mb-4">Images</h2>
        {images.length === 0 ? (
          <p className="text-ink-soft/70 text-sm">Aucune image pour le moment.</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {images.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <div key={img._id} className="border border-silver-soft rounded-lg overflow-hidden">
                <img src={img.url} alt={img.type} className="w-full h-40 object-cover bg-ivory-soft" />
                <div className="p-3 flex justify-between items-center text-sm">
                  <span className="text-ink-soft">{img.type}</span>
                  {canWrite && (
                    <button onClick={() => handleDelete(img._id)} className="text-red-600 hover:underline text-xs">
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
