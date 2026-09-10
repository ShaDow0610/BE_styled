"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/common/ToastProvider";

interface UserRow {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "gestion_stock" | "lecture_seule";
  active: boolean;
}

const EMPTY_FORM = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  role: "lecture_seule" as UserRow["role"],
};

const ROLE_LABELS: Record<UserRow["role"], string> = {
  admin: "Admin",
  gestion_stock: "Gestion stock",
  lecture_seule: "Lecture seule",
};

export default function UsersPage() {
  const router = useRouter();
  const toast = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!token || !userData) {
      router.push("/login");
      return;
    }
    const role = JSON.parse(userData).role;
    if (role !== "admin") {
      router.push("/dashboard");
      return;
    }
    setIsAdmin(true);
    setIsChecking(false);
    load();
  }, [router]);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers((await res.json()).data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setError(data.error || "Erreur lors de la création");
      toast.error(data.error || "Erreur lors de la création");
      return;
    }
    setForm(EMPTY_FORM);
    setShowForm(false);
    toast.success("Utilisateur créé");
    load();
  };

  const updateUser = async (id: string, update: Partial<Pick<UserRow, "role" | "active">>) => {
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    toast.success("Utilisateur mis à jour");
    load();
  };

  const filteredUsers = users.filter(
    (u) =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isChecking || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="font-serif text-3xl text-ink">Utilisateurs</h1>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
            Nouvel utilisateur
          </button>
          <Link href="/admin" className="px-4 py-2 border border-silver-soft text-ink-soft rounded-lg hover:bg-ivory-soft transition-colors">
            ← Retour
          </Link>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6 grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Prénom</label>
            <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Nom</label>
            <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Rôle</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRow["role"] })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
              <option value="lecture_seule">Lecture seule</option>
              <option value="gestion_stock">Gestion stock</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Email</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Mot de passe</label>
            <input required type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
          </div>
          {error && <p className="md:col-span-3 text-sm text-red-600">{error}</p>}
          <div className="md:col-span-3">
            <button type="submit" className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
              Créer
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 max-w-md">
        <input
          type="text"
          placeholder="Rechercher un utilisateur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ink"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-soft/70 border-b border-silver-soft">
                <th className="py-2 pr-4">Nom</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Rôle</th>
                <th className="py-2 pr-4">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u._id} className="border-b border-silver-soft/50">
                  <td className="py-2 pr-4 text-ink font-medium">{u.firstName} {u.lastName}</td>
                  <td className="py-2 pr-4 text-ink-soft">{u.email}</td>
                  <td className="py-2 pr-4">
                    <select
                      value={u.role}
                      onChange={(e) => updateUser(u._id, { role: e.target.value as UserRow["role"] })}
                      className="px-2 py-1 border border-silver-soft rounded text-xs">
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-4">
                    <button
                      onClick={() => updateUser(u._id, { active: !u.active })}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        u.active ? "bg-ivory-soft text-ink" : "bg-silver-soft text-ink-soft/60"
                      }`}>
                      {u.active ? "Actif" : "Désactivé"}
                    </button>
                  </td>
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
