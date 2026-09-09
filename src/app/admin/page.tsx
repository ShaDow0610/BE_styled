"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCog,
  faUsers,
  faDatabase,
  faBell,
} from "@fortawesome/free-solid-svg-icons";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    const parsed = JSON.parse(userData);
    if (parsed.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    setUser(parsed);
  }, [router]);

  const adminSections = [
    {
      icon: faUsers,
      title: "Gestion des Utilisateurs",
      description: "Gérer les rôles et les permissions",
      action: "Gérer",
    },
    {
      icon: faDatabase,
      title: "Base de Données",
      description: "Statistiques et maintenance DB",
      action: "Voir",
    },
    {
      icon: faBell,
      title: "Notifications",
      description: "Configuration des alertes",
      action: "Configurer",
    },
    {
      icon: faCog,
      title: "Paramètres",
      description: "Configuration de l'application",
      action: "Paramétrer",
    },
  ];

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          🔧 Panel Administrateur
        </h1>
        <p className="text-gray-600">
          Bienvenue {user.firstName} {user.lastName}
        </p>
      </motion.div>

      {/* Admin Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Utilisateurs Actifs", value: "23" },
          { label: "Total Produits", value: "1,247" },
          { label: "Commandes ce mois", value: "156" },
          { label: "Revenue", value: "$12,540" },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
            <p className="text-gray-600 text-sm mb-2">{stat.label}</p>
            <p className="text-3xl font-bold text-blue-600">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Admin Sections */}
      <div className="grid md:grid-cols-2 gap-6">
        {adminSections.map((section, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl text-blue-600">
                <FontAwesomeIcon icon={section.icon} className="w-8 h-8" />
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium">
                {section.action}
              </button>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {section.title}
            </h3>
            <p className="text-gray-600">{section.description}</p>
          </motion.div>
        ))}
      </div>

      {/* System Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          📊 Informations Système
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <p className="text-gray-600 mb-2">Version</p>
            <p className="text-lg font-semibold text-gray-800">1.0.0</p>
          </div>
          <div>
            <p className="text-gray-600 mb-2">Statut Base de Données</p>
            <p className="text-lg font-semibold text-green-600">✓ Connecté</p>
          </div>
          <div>
            <p className="text-gray-600 mb-2">Dernière Maintenance</p>
            <p className="text-lg font-semibold text-gray-800">Aujourd'hui</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
