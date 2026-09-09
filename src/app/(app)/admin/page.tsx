"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTags,
  faTruckField,
  faTicket,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";

interface StoredUser {
  firstName: string;
  lastName: string;
  role: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(userData));
  }, [router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink"></div>
      </div>
    );
  }

  const sections = [
    {
      href: "/admin/brands",
      icon: faTags,
      title: "Marques partenaires",
      description: "Gérer les marques d'accessoires partenaires",
      visible: true,
    },
    {
      href: "/admin/suppliers",
      icon: faTruckField,
      title: "Fournisseurs",
      description: "Usines Chine et couturiers locaux",
      visible: true,
    },
    {
      href: "/admin/promo-codes",
      icon: faTicket,
      title: "Codes promo",
      description: "Création et suivi des codes de réduction",
      visible: true,
    },
    {
      href: "/admin/users",
      icon: faUsers,
      title: "Utilisateurs",
      description: "Rôles et accès de l'équipe",
      visible: user.role === "admin",
    },
  ].filter((s) => s.visible);

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8">
        <h1 className="font-serif text-4xl text-ink mb-2">Administration</h1>
        <p className="text-ink-soft/70">
          Bienvenue {user.firstName} {user.lastName}
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {sections.map((section, idx) => (
          <motion.div
            key={section.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}>
            <Link
              href={section.href}
              className="block bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl text-ink">
                  <FontAwesomeIcon icon={section.icon} className="w-8 h-8" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-ink mb-2">{section.title}</h3>
              <p className="text-ink-soft/80">{section.description}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
