import { colorSwatchHex } from "@/lib/colorSwatches";

export default function ColorSwatches({ couleurs, max = 4 }: { couleurs: string[]; max?: number }) {
  if (!couleurs || couleurs.length === 0) return null;
  const shown = couleurs.slice(0, max);
  const extra = couleurs.length - shown.length;

  return (
    <div className="flex items-center gap-1 mt-2">
      {shown.map((c) => {
        const hex = colorSwatchHex(c);
        return (
          <span
            key={c}
            title={c}
            className="w-3.5 h-3.5 rounded-full border border-silver-soft shrink-0"
            style={{ backgroundColor: hex ?? "#e5e5e5" }}
          />
        );
      })}
      {extra > 0 && <span className="text-[10px] text-ink-soft/60 ml-0.5">+{extra}</span>}
    </div>
  );
}
