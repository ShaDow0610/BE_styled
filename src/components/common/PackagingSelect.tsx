"use client";

import { useEffect, useState } from "react";

interface PackagingOption {
  _id: string;
  nom: string;
  prix_unitaire: number;
}

interface PackagingSelectProps {
  /** Coût total (prix_unitaire × quantité), tenu à jour par le composant. */
  onTotalChange: (total: number) => void;
}

export default function PackagingSelect({ onTotalChange }: PackagingSelectProps) {
  const [options, setOptions] = useState<PackagingOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [quantite, setQuantite] = useState("1");
  const [isAdding, setIsAdding] = useState(false);
  const [newNom, setNewNom] = useState("");
  const [newPrix, setNewPrix] = useState("");

  const load = () => {
    fetch("/api/packaging")
      .then((r) => r.json())
      .then((d) => setOptions(d.data || []));
  };

  useEffect(load, []);

  const selected = options.find((o) => o._id === selectedId);

  useEffect(() => {
    const total = selected ? selected.prix_unitaire * (Number(quantite) || 0) : 0;
    onTotalChange(Math.round(total * 100) / 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, quantite, options]);

  const handleAdd = async () => {
    const nom = newNom.trim();
    const prix = Number(newPrix);
    if (!nom || !prix || prix <= 0) return;
    const res = await fetch("/api/packaging", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, prix_unitaire: prix }),
    });
    if (res.ok) {
      const data = await res.json();
      setNewNom("");
      setNewPrix("");
      setIsAdding(false);
      setSelectedId(data.data._id);
      load();
    }
  };

  if (isAdding) {
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          value={newNom}
          onChange={(e) => setNewNom(e.target.value)}
          placeholder="Nom (ex: boîte cadeau)"
          className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
        />
        <input
          type="number" step="0.01" min="0"
          value={newPrix}
          onChange={(e) => setNewPrix(e.target.value)}
          placeholder="Prix unitaire"
          className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
        />
        <button type="button" onClick={handleAdd} className="px-3 py-2 bg-ink text-ivory rounded-lg text-sm shrink-0">
          Ajouter
        </button>
        <button
          type="button"
          onClick={() => { setIsAdding(false); setNewNom(""); setNewPrix(""); }}
          className="px-3 py-2 border border-silver-soft text-ink-soft rounded-lg text-sm shrink-0">
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
        <option value="">Choisir un type...</option>
        {options.map((o) => (
          <option key={o._id} value={o._id}>{o.nom} ({o.prix_unitaire})</option>
        ))}
      </select>
      <input
        type="number" min="0" step="1"
        value={quantite}
        onChange={(e) => setQuantite(e.target.value)}
        placeholder="Qté"
        className="w-24 px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink shrink-0"
      />
      <button
        type="button"
        onClick={() => setIsAdding(true)}
        title="Ajouter un nouveau type"
        className="px-3 py-2 border border-silver-soft text-ink-soft rounded-lg text-sm shrink-0 hover:border-ink hover:text-ink">
        +
      </button>
    </div>
  );
}
