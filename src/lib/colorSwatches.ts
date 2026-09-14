/**
 * Couleurs saisies en texte libre (via EditableMultiSelect) — pas d'enum
 * fermée possible. On mappe les noms les plus courants vers une couleur
 * réelle pour une pastille visuelle ; les noms inconnus retombent sur une
 * pastille neutre (le nom reste lisible en info-bulle).
 */
const COLOR_MAP: Record<string, string> = {
  noir: "#0b0b0c",
  blanc: "#ffffff",
  gris: "#9ca3af",
  beige: "#e8dcc8",
  rose: "#f4a6c1",
  rouge: "#dc2626",
  bordeaux: "#7f1d1d",
  bleu: "#2563eb",
  "bleu navy": "#1e293b",
  "bleu marine": "#1e293b",
  vert: "#16a34a",
  "vert sombre": "#14532d",
  kaki: "#6b7a4a",
  moutarde: "#c9971f",
  jaune: "#eab308",
  orange: "#f97316",
  marron: "#78350f",
  violet: "#7c3aed",
  mauve: "#a78bfa",
  corail: "#f4756b",
  doré: "#c9a34e",
  dore: "#c9a34e",
  argenté: "#c0c0c8",
  argente: "#c0c0c8",
  crème: "#f5eddb",
  creme: "#f5eddb",
  turquoise: "#14b8a6",
  fuchsia: "#d946ef",
};

export function colorSwatchHex(name: string): string | null {
  return COLOR_MAP[name.trim().toLowerCase()] ?? null;
}
