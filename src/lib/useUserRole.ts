"use client";

import { useEffect, useState } from "react";

export function useUserRole() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setRole(JSON.parse(userData).role);
    }
  }, []);

  return {
    role,
    canWrite: role === "admin" || role === "gestion_stock",
    isAdmin: role === "admin",
  };
}
