"use client";

import { useEffect, useState } from "react";

interface Option {
  _id: string;
  valeur: string;
}

interface EditableSelectProps {
  type: "couleur" | "taille" | "matiere";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function EditableSelect({
  type,
  value,
  onChange,
  placeholder,
  required,
  className,
}: EditableSelectProps) {
  const [options, setOptions] = useState<Option[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newValue, setNewValue] = useState("");

  const load = () => {
    fetch(`/api/list-options?type=${type}`)
      .then((r) => r.json())
      .then((d) => setOptions(d.data || []));
  };

  useEffect(load, [type]);

  const handleAdd = async () => {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    const res = await fetch("/api/list-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, valeur: trimmed }),
    });
    if (res.ok) {
      setNewValue("");
      setIsAdding(false);
      onChange(trimmed);
      load();
    }
  };

  const baseClassName =
    className ||
    "w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink";

  if (isAdding) {
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Nouvelle valeur..."
          className={baseClassName}
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-3 py-2 bg-ink text-ivory rounded-lg text-sm shrink-0">
          Ajouter
        </button>
        <button
          type="button"
          onClick={() => { setIsAdding(false); setNewValue(""); }}
          className="px-3 py-2 border border-silver-soft text-ink-soft rounded-lg text-sm shrink-0">
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={baseClassName}>
        <option value="">{placeholder || "Choisir..."}</option>
        {options.map((o) => (
          <option key={o._id} value={o.valeur}>{o.valeur}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setIsAdding(true)}
        title="Ajouter une nouvelle valeur"
        className="px-3 py-2 border border-silver-soft text-ink-soft rounded-lg text-sm shrink-0 hover:border-ink hover:text-ink">
        +
      </button>
    </div>
  );
}
