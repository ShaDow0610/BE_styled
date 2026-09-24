/**
 * Case "studio" pour une image produit/look — fournit elle-même le décor
 * (lumière + ombre au sol) autour du sujet, visible sur les bords/coins
 * non couverts par la photo (fond manquant, image transparente).
 *
 * `fit="cover"` (par défaut) : la photo remplit tout le cadre, comme une
 * vraie photo produit — adapté aux photos normales (JPEG, selfie miroir...)
 * qui composent le fond de la boutique aujourd'hui.
 * `fit="contain"` : la photo entière reste visible sans être rognée,
 * flottant au-dessus du décor — à réserver aux images détourées (fond
 * transparent), où recadrer couperait le sujet.
 */
export default function PhotoStage({
  src,
  alt,
  aspect = "aspect-[3/4]",
  rounded = "rounded-lg",
  padding,
  fit = "cover",
  className = "",
}: {
  src: string | null | undefined;
  alt: string;
  aspect?: string;
  rounded?: string;
  padding?: string;
  fit?: "cover" | "contain";
  className?: string;
}) {
  const resolvedPadding = padding ?? (fit === "contain" ? "p-6" : "p-0");
  const objectFit = fit === "contain" ? "object-contain" : "object-cover";

  return (
    <div className={`photo-stage ${aspect} ${rounded} ${className}`}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={`relative z-10 w-full h-full ${objectFit} ${resolvedPadding} group-hover:scale-105 transition-transform duration-300`}
        />
      )}
    </div>
  );
}
