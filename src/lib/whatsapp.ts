interface WhatsAppProductInfo {
  nom: string;
  reference: string;
  taille?: string;
  couleur?: string;
}

/**
 * Construit un lien wa.me avec un message pré-rempli. encodeURIComponent
 * gère nativement les accents et espaces (exigence du cahier des charges).
 */
export function buildWhatsAppLink(product: WhatsAppProductInfo): string {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '000000000000';

  const variantInfo =
    product.taille || product.couleur
      ? ` (taille ${product.taille ?? '—'}, couleur ${product.couleur ?? '—'})`
      : '';

  const message = `Bonjour, je suis intéressé(e) par ${product.nom} (réf. ${product.reference})${variantInfo}.`;

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppLookLink(lookNom: string): string {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '000000000000';
  const message = `Bonjour, je suis intéressé(e) par le look "${lookNom}".`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
