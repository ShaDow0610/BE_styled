import { dbConnect } from '@/lib/db/connection';
import BusinessCard, { ILienCarte } from '@/lib/models/BusinessCard';

export interface BusinessCardData {
  nom: string;
  organisation: string;
  telephone: string;
  liens: ILienCarte[];
}

/**
 * Lit la carte de visite (document singleton) — en crée une par défaut si
 * elle n'existe pas encore. Utilisé à la fois par la page publique /carte
 * et par la génération du .vcf : les deux lisent toujours l'état courant,
 * donc modifier un lien depuis l'admin s'applique immédiatement au prochain
 * scan du QR code (qui pointe vers une URL fixe, pas vers un fichier figé).
 */
export async function getBusinessCard(): Promise<BusinessCardData> {
  await dbConnect();
  let card = await BusinessCard.findOne();
  if (!card) {
    card = await BusinessCard.create({
      nom: 'Be Styled',
      organisation: 'Be Styled',
      telephone: '',
      liens: [],
    });
  }
  return {
    nom: card.nom,
    organisation: card.organisation || '',
    telephone: card.telephone || '',
    liens: card.liens || [],
  };
}

function escapeVCard(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

/**
 * Génère le contenu .vcf (format vCard 3.0, compatible iOS/Android). Chaque
 * lien est exposé à la fois comme URL générique (lu par tous les téléphones)
 * et, pour un lien "TikTok", en plus via X-SOCIALPROFILE (reconnu par
 * l'app Contacts d'Apple pour un rendu plus riche).
 */
export function buildVCard(card: BusinessCardData): string {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];

  lines.push(`N:;${escapeVCard(card.nom)};;;`);
  lines.push(`FN:${escapeVCard(card.nom)}`);
  if (card.organisation) {
    lines.push(`ORG:${escapeVCard(card.organisation)};`);
  }
  if (card.telephone) {
    lines.push(`TEL;type=CELL;type=VOICE;type=pref:${card.telephone}`);
  }

  card.liens.forEach((lien, index) => {
    const item = `item${index + 1}`;
    if (lien.label.toLowerCase().includes('tiktok')) {
      lines.push(`X-SOCIALPROFILE;type=TikTok;x-apple:${lien.url}`);
    }
    lines.push(`${item}.URL;type=pref:${lien.url}`);
    lines.push(`${item}.X-ABLabel:${escapeVCard(lien.label)}`);
  });

  lines.push('END:VCARD');
  return lines.join('\r\n') + '\r\n';
}
