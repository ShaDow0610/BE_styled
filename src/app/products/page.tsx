"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ProductList from "@/components/dashboard/ProductList";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSearch } from "@fortawesome/free-solid-svg-icons";

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  sku: string;
  images?: string[];
}

const CATEGORIES = ["clothing", "accessories", "jewelry", "shoes", "outfit"];

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchProducts();
  }, [router, selectedCategory]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.append("category", selectedCategory);
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

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-8">
        <h1 className="font-serif text-3xl text-ink">Produits</h1>
        <button className="flex items-center gap-2 px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
          <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
          Nouveau Produit
        </button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Search */}
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
                placeholder="Nom ou SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">
              Catégorie
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
              <option value="">Toutes les catégories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
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
