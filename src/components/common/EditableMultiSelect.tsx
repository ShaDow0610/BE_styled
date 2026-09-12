"use client";

import { useEffect, useState } from "react";

interface Option {
  _id: string;
  valeur: string;
}

interface EditableMultiSelectProps {
  type: "couleur" | "taille";
  values: string[];
  onChange: (values: string[]) => void;
}

export default function EditableMultiSelect({ type, values, onChange }: EditableMultiSelectProps) {
  const [options, setOptions] = useState<Option[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newValue, setNewValue] = useState("");

  const load = () => {
    fetch(`/api/list-options?type=${type}`)
      .then((r) => r.json())
      .then((d) => setOptions(d.data || []));
  };

  useEffect(load, [type]);

  const toggle = (valeur: string) => {
    if (values.includes(valeur)) onChange(values.filter((v) => v !== valeur));
    else onChange([...values, valeur]);
  };

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
      onChange([...values, trimmed]);
      load();
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o._id}
            type="button"
            onClick={() => toggle(o.valeur)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              values.includes(o.valeur)
                ? "bg-ink text-ivory border-ink"
                : "border-silver-soft text-ink-soft hover:border-ink hover:text-ink"
            }`}>
            {o.valeur}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="px-3 py-1.5 rounded-lg text-sm border border-dashed border-silver-soft text-ink-soft hover:border-ink hover:text-ink">
          + Nouvelle valeur
        </button>
      </div>

      {isAdding && (
        <div className="flex gap-2 mt-2">
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
            className="px-3 py-1.5 border border-silver-soft rounded-lg text-sm focus:outline-none focus:border-ink"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="px-3 py-1.5 bg-ink text-ivory rounded-lg text-sm shrink-0">
            Ajouter
          </button>
          <button
            type="button"
            onClick={() => { setIsAdding(false); setNewValue(""); }}
            className="px-3 py-1.5 border border-silver-soft text-ink-soft rounded-lg text-sm shrink-0">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
