"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const LINES = [
  "Chaque tenue raconte quelque chose.",
  "Pas de hasard. Juste du style, pensé pièce par pièce.",
  "Be Styled — le style, votre signature.",
];

/**
 * Section narrative "sticky crossfade" : le bloc reste fixe à l'écran
 * pendant que le scroll fait défiler les lignes de texte en fondu — le
 * scroll pilote l'histoire au lieu de simplement faire défiler la page.
 * Inspiré des maisons de mode "quiet luxury" (Bottega Veneta) : on marque
 * une pause narrative avant d'entrer dans la zone plus transactionnelle.
 */
export default function StorytellingSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const lines = lineRefs.current.filter(Boolean) as HTMLParagraphElement[];
    if (lines.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.set(lines, { opacity: 0, y: 24 });
      gsap.set(lines[0], { opacity: 1, y: 0 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: `+=${lines.length * 100}%`,
          scrub: 0.6,
          pin: true,
        },
      });

      lines.forEach((line, i) => {
        if (i === 0) return;
        tl.to(lines[i - 1], { opacity: 0, y: -24, duration: 0.5 }, i - 0.5);
        tl.to(line, { opacity: 1, y: 0, duration: 0.5 }, i - 0.5);
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="relative h-[70vh] flex items-center justify-center overflow-hidden">
      <div className="container mx-auto px-4 text-center max-w-2xl">
        <div className="relative h-24 md:h-16">
          {LINES.map((text, i) => (
            <p
              key={text}
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              className="absolute inset-0 flex items-center justify-center font-serif text-2xl md:text-4xl text-ink px-4">
              {text}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
