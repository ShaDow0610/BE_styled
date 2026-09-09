"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import StatCard from "@/components/dashboard/StatCard";
import ProductList from "@/components/dashboard/ProductList";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBox, faChartLine, faCubes } from "@fortawesome/free-solid-svg-icons";

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  sku: string;
  images?: string[];
}

interface Stats {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  categories: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalValue: 0,
    lowStockItems: 0,
    categories: 5,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Récupérer les produits
      const productsRes = await fetch("/api/products?limit=10");
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.data);

        // Calculer les stats
        const totalValue = data.data.reduce(
          (sum: number, p: Product) => sum + p.price,
          0,
        );

        setStats({
          totalProducts: data.pagination?.total || data.data.length,
          totalValue: Math.round(totalValue),
          lowStockItems: Math.floor(data.data.length * 0.2),
          categories: 5,
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-8">
        <h1 className="font-serif text-3xl text-ink">Dashboard</h1>
        <button
          onClick={handleLogout}
          className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
          Se déconnecter
        </button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Produits"
          value={stats.totalProducts}
          icon={<FontAwesomeIcon icon={faBox} />}
          color="bg-ink"
          trend={12}
        />
        <StatCard
          title="Valeur Stock"
          value={`$${stats.totalValue.toLocaleString()}`}
          icon={<FontAwesomeIcon icon={faChartLine} />}
          color="bg-ink-soft"
          trend={8}
        />
        <StatCard
          title="Stock Faible"
          value={stats.lowStockItems}
          icon={<FontAwesomeIcon icon={faCubes} />}
          color="bg-ink-soft"
          trend={-3}
        />
        <StatCard
          title="Catégories"
          value={stats.categories}
          icon={<FontAwesomeIcon icon={faBox} />}
          color="bg-ink"
        />
      </div>

      {/* Products List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="font-serif text-2xl text-ink mb-6">
          Produits Récents
        </h2>
        {products.length > 0 ? (
          <ProductList products={products} />
        ) : (
          <p className="text-ink-soft/70 text-center py-8">
            Aucun produit trouvé. Commencez par ajouter des produits.
          </p>
        )}
      </motion.div>
    </div>
  );
}
