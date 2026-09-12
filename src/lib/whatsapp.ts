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

  const details: string[] = [];
  if (product.taille) details.push(`taille ${product.taille}`);
  if (product.couleur) details.push(`couleur ${product.couleur}`);
  const variantInfo = details.length > 0 ? ` (${details.join(', ')})` : '';

  const message = `Bonjour, je suis intéressé(e) par ${product.nom} (réf. ${product.reference})${variantInfo}.`;

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppLookLink(lookNom: string): string {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '000000000000';
  const message = `Bonjour, je suis intéressé(e) par le look "${lookNom}".`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
