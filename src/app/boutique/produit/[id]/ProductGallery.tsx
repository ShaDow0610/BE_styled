"use client";

import { useState } from "react";

interface Props {
  images: string[];
  alt: string;
}

export default function ProductGallery({ images, alt }: Props) {
  const [selected, setSelected] = useState(0);

  if (images.length === 0) {
    return <div className="w-full rounded-lg bg-ivory-soft aspect-square" />;
  }

  return (
    <div>
      {/* Image principale — pas de recadrage forcé : la photo garde ses
          proportions réelles, juste plafonnée en hauteur pour rester
          raisonnable sur les photos très hautes/étroites. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[selected]}
        alt={alt}
        className="w-full h-auto max-h-[75vh] object-contain rounded-lg bg-ivory-soft mx-auto"
      />

      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2 mt-3">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setSelected(i)}
              className={`aspect-square rounded overflow-hidden border-2 transition-colors ${
                i === selected ? "border-ink" : "border-transparent hover:border-silver-soft"
              }`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={alt} className="w-full h-full object-cover bg-ivory-soft" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
