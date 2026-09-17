/**
 * Case "studio" pour une image produit/look — fournit elle-même le décor
 * (lumière + ombre au sol) autour du sujet. Faite pour des images détourées
 * (fond transparent) affichées en object-contain, mais fonctionne aussi
 * avec une photo pleine (object-contain centre alors l'image dans la case).
 */
export default function PhotoStage({
  src,
  alt,
  aspect = "aspect-[3/4]",
  rounded = "rounded-lg",
  padding = "p-6",
  className = "",
}: {
  src: string | null | undefined;
  alt: string;
  aspect?: string;
  rounded?: string;
  padding?: string;
  className?: string;
}) {
  return (
    <div className={`photo-stage ${aspect} ${rounded} ${className}`}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={`relative z-10 w-full h-full object-contain ${padding} group-hover:scale-105 transition-transform duration-300`}
        />
      )}
    </div>
  );
}
