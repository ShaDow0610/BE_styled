"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Price from "./Price";
import PhotoStage from "./PhotoStage";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface FeaturedLook {
  _id: string;
  nom: string;
  prix_pack: number;
  photo_couverture: string;
}

/**
 * Le look à la une entre en scène avec un léger zoom-arrière cinématique
 * (image qui se resserre à sa taille finale) pendant que le panneau
 * d'info glisse et se dévoile — le moment "captivant" de la page, sans
 * dépendre de nouvelles photos : juste une mise en scène de ce qu'on a.
 */
export default function FeaturedLookReveal({ look }: { look: FeaturedLook }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const imgWrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        imgWrapRef.current,
        { scale: 1.18 },
        {
          scale: 1,
          duration: 1.1,
          ease: "power2.out",
          scrollTrigger: { trigger: rootRef.current, start: "top 85%", toggleActions: "play none none reverse" },
        }
      );
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, x: 24 },
        {
          opacity: 1,
          x: 0,
          duration: 0.8,
          delay: 0.25,
          ease: "power2.out",
          scrollTrigger: { trigger: rootRef.current, start: "top 85%", toggleActions: "play none none reverse" },
        }
      );
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} id="looks" className="relative container mx-auto px-4 pb-10 md:pb-14 scroll-mt-8">
      <Link
        href={`/boutique/looks/${look._id}`}
        className="group grid sm:grid-cols-2 max-w-3xl mx-auto bg-white rounded-xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow">
        <div ref={imgWrapRef} className="overflow-hidden">
          <PhotoStage src={look.photo_couverture} alt={look.nom} aspect="aspect-[3/4]" rounded="" />
        </div>
        <div ref={panelRef} className="p-6 md:p-10 flex flex-col justify-center">
          <p className="text-xs tracking-[0.25em] uppercase text-ink-soft/50 mb-2">Look du moment</p>
          <h2 className="font-serif text-2xl md:text-3xl text-ink mb-3">{look.nom}</h2>
          <Price xaf={look.prix_pack} className="text-lg font-bold text-ink mb-5" />
          <span className="inline-flex items-center justify-center gap-2 px-5 py-2 border border-ink text-ink rounded-lg text-sm font-medium group-hover:bg-ink group-hover:text-ivory transition-colors self-start">
            Découvrir la composition
          </span>
        </div>
      </Link>
    </div>
  );
}
