"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import ScrollToPlugin from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollToPlugin);

interface CardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: number;
  color?: string;
}

export const StatCard: React.FC<CardProps> = ({
  title,
  value,
  icon,
  trend,
  color = "bg-blue-500",
}) => {
  const cardRef = useRef(null);

  useEffect(() => {
    const card = cardRef.current as HTMLElement | null;
    if (!card) return;

    // Hover animation with GSAP
    const handleMouseEnter = () => {
      gsap.to(card, {
        scale: 1.05,
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
        duration: 0.3,
        ease: "power2.out",
      });
    };

    const handleMouseLeave = () => {
      gsap.to(card, {
        scale: 1,
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        duration: 0.3,
        ease: "power2.out",
      });
    };

    card.addEventListener("mouseenter", handleMouseEnter);
    card.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      card.removeEventListener("mouseenter", handleMouseEnter);
      card.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`${color} rounded-lg p-6 text-white shadow-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-80">{title}</p>
          <h3 className="text-3xl font-bold mt-2">{value}</h3>
          {trend !== undefined && (
            <p
              className={`text-sm mt-1 ${trend > 0 ? "text-green-200" : "text-red-200"}`}>
              {trend > 0 ? "+" : ""}
              {trend}% from last month
            </p>
          )}
        </div>
        {icon && <div className="text-4xl opacity-50">{icon}</div>}
      </div>
    </motion.div>
  );
};

export default StatCard;
