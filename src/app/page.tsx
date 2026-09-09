"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBox,
  faCubes,
  faChartLine,
  faShieldAlt,
  faRocket,
} from "@fortawesome/free-solid-svg-icons";

export default function Home() {
  const titleRef = useRef(null);
  const ctaRef = useRef(null);

  useEffect(() => {
    if (titleRef.current) {
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
      );
    }

    if (ctaRef.current) {
      gsap.fromTo(
        ctaRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, delay: 0.3, ease: "power3.out" },
      );
    }
  }, []);

  const features = [
    {
      icon: faCubes,
      title: "Gestion de Stock",
      description:
        "Suivi en temps réel de vos stocks de vêtements et accessoires",
    },
    {
      icon: faChartLine,
      title: "Analytics",
      description: "Tableaux de bord détaillés avec statistiques complètes",
    },
    {
      icon: faBox,
      title: "Catégories",
      description:
        "Organisez vos produits: vêtements, bijoux, chaussures, outfits",
    },
    {
      icon: faShieldAlt,
      title: "Sécurisé",
      description: "Authentification JWT et gestion des permissions d'accès",
    },
    {
      icon: faRocket,
      title: "Performance",
      description:
        "Optimisé avec Next.js 14 et Turbopack pour une vitesse maximale",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <motion.div
          ref={titleRef}
          className="text-center mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-6">
            ✨ Zephyr
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            Gestion de stock intelligente pour votre boutique
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Gérez efficacement votre inventaire de vêtements, accessoires,
            bijoux, chaussures et outfits avec une interface moderne et
            performante.
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          ref={ctaRef}
          className="flex gap-4 justify-center flex-wrap mb-16">
          <Link
            href="/login"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg">
            Se connecter
          </Link>
          <a
            href="#features"
            className="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg border-2 border-blue-600">
            En savoir plus
          </a>
        </motion.div>

        {/* Features */}
        <div
          id="features"
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-20">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="bg-white rounded-lg p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-4xl text-blue-600 mb-4">
                <FontAwesomeIcon icon={feature.icon} className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Tech Stack */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-20 bg-white rounded-lg p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Technologie Moderne
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-blue-600 mb-2">Frontend</h3>
              <ul className="text-gray-600 space-y-1 text-sm">
                <li>✓ Next.js 14</li>
                <li>✓ React 19</li>
                <li>✓ TypeScript</li>
                <li>✓ Tailwind CSS</li>
                <li>✓ Framer Motion</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-blue-600 mb-2">Animations</h3>
              <ul className="text-gray-600 space-y-1 text-sm">
                <li>✓ GSAP</li>
                <li>✓ ScrollTrigger</li>
                <li>✓ Lenis Motion</li>
                <li>✓ FontAwesome Icons</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-blue-600 mb-2">Backend</h3>
              <ul className="text-gray-600 space-y-1 text-sm">
                <li>✓ MongoDB</li>
                <li>✓ API REST</li>
                <li>✓ JWT Auth</li>
                <li>✓ Mongoose ODM</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
