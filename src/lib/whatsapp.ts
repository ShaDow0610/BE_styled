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

/**
 * Lien wa.me vers le CLIENT (pas la boutique) pour relancer un impayé —
 * seul cas où on ouvre une conversation vers un numéro autre que celui de
 * la boutique. Retourne null si aucun téléphone n'est enregistré sur la
 * facture, pour que l'UI puisse cacher le bouton plutôt que d'ouvrir un
 * lien invalide.
 */
export function buildWhatsAppReminderLink(params: {
  telephone?: string;
  numeroFacture: string;
  montantDu: string;
}): string | null {
  const digits = (params.telephone || '').replace(/[^\d]/g, '');
  if (!digits) return null;

  const message = `Bonjour, un petit rappel concernant votre facture ${params.numeroFacture} : il reste ${params.montantDu} à régler. Merci !`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
