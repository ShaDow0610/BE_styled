"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ProductList, { ProductListItem } from "@/components/dashboard/ProductList";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSearch } from "@fortawesome/free-solid-svg-icons";
import { useUserRole } from "@/lib/useUserRole";

const CATEGORIES = [
  "pantalon",
  "chemise",
  "tricot",
  "culotte",
  "bracelet",
  "montre",
  "chaussure",
  "bague",
  "chapeau",
  "lunette",
  "autre",
];

const STATUTS = [
  "brouillon",
  "en_commande",
  "en_transit",
  "en_confection",
  "disponible",
  "rupture",
  "archive",
];

const EMPTY_FORM = {
  nom: "",
  reference: "",
  categorie: CATEGORIES[0],
  origine: "import_chine" as "import_chine" | "local",
  poids_kg: "",
  description: "",
};

export default function ProductsPage() {
  const router = useRouter();
  const { canWrite } = useUserRole();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [selectedOrigine, setSelectedOrigine] = useState("");
  const [selectedCategorie, setSelectedCategorie] = useState("");
  const [selectedStatut, setSelectedStatut] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, selectedOrigine, selectedCategorie, selectedStatut]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedOrigine) params.append("origine", selectedOrigine);
      if (selectedCategorie) params.append("categorie", selectedCategorie);
      if (selectedStatut) params.append("statut", selectedStatut);
      params.append("limit", "50");

      const response = await fetch(`/api/products?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setIsSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, poids_kg: Number(form.poids_kg) || 0 }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de la création du produit");
      }
      router.push(`/products/${data.data._id}`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.reference.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-8">
        <h1 className="font-serif text-3xl text-ink">Produits</h1>
        {canWrite && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
            <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
            Nouveau Produit
          </button>
        )}
      </motion.div>

      {/* Create form */}
      {showForm && canWrite && (
        <motion.form
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleCreate}
          className="bg-white rounded-lg shadow p-6 mb-6 grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Nom</label>
            <input
              required
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Référence (SKU racine)</label>
            <input
              required
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Catégorie</label>
            <select
              value={form.categorie}
              onChange={(e) => setForm({ ...form, categorie: e.target.value })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Origine</label>
            <select
              value={form.origine}
              onChange={(e) =>
                setForm({ ...form, origine: e.target.value as "import_chine" | "local" })
              }
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
              <option value="import_chine">Import Chine</option>
              <option value="local">Local</option>
            </select>
          </div>
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
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-ink-soft mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
              rows={3}
            />
          </div>
          {formError && (
            <p className="md:col-span-2 text-sm text-red-600">{formError}</p>
          )}
          <div className="md:col-span-2 flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors disabled:opacity-50">
              {isSaving ? "Création..." : "Créer le produit"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 py-2 border border-silver-soft text-ink-soft rounded-lg hover:bg-ivory-soft transition-colors">
              Annuler
            </button>
          </div>
        </motion.form>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">
              Rechercher
            </label>
            <div className="relative">
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-3 top-3 w-4 h-4 text-silver"
              />
              <input
                type="text"
                placeholder="Nom ou référence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Origine</label>
            <select
              value={selectedOrigine}
              onChange={(e) => setSelectedOrigine(e.target.value)}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
              <option value="">Toutes</option>
              <option value="import_chine">Import Chine</option>
              <option value="local">Local</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">
              Catégorie
            </label>
            <select
              value={selectedCategorie}
              onChange={(e) => setSelectedCategorie(e.target.value)}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
              <option value="">Toutes les catégories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Statut</label>
            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value)}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
              <option value="">Tous</option>
              {STATUTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Products List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink"></div>
          </div>
        ) : filteredProducts.length > 0 ? (
          <ProductList products={filteredProducts} />
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-ink-soft/70 text-lg">
              Aucun produit trouvé avec ces critères.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
