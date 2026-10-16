import type { Locale } from '@portfolio/content';

export type PrivacyProcessor = {
  paragraphEn: string;
  paragraphFr: string;
};

/** Plan 7: assign when model mode is enabled with the benchmark provider name. */
export const chatModelProcessor: PrivacyProcessor | null = null;

export const privacyProcessors: PrivacyProcessor[] = [
  {
    paragraphEn:
      'Country (country.is) receives the IP address only when a country fallback is needed to select a default language.',
    paragraphFr:
      'Country (country.is) reçoit l’adresse IP uniquement lorsqu’un pays est nécessaire pour choisir la langue par défaut.',
  },
  {
    paragraphEn: 'Google sends email notifications when a contact message arrives (SMTP).',
    paragraphFr: 'Google envoie les notifications e-mail lors d’un message de contact (SMTP).',
  },
  {
    paragraphEn: 'OVHcloud hosts the VPS running the API and Directus.',
    paragraphFr: 'OVHcloud héberge le VPS qui exécute l’API et Directus.',
  },
  {
    paragraphEn: 'GitHub hosts the static site.',
    paragraphFr: 'GitHub héberge le site statique.',
  },
  {
    paragraphEn: 'Cloudflare stores encrypted backups of production data.',
    paragraphFr: 'Cloudflare stocke les sauvegardes chiffrées des données de production.',
  },
];

export function processorParagraphs(locale: Locale): string[] {
  const entries =
    chatModelProcessor === null ? privacyProcessors : [chatModelProcessor, ...privacyProcessors];
  if (locale === 'fr') {
    return entries.map((entry) => entry.paragraphFr);
  }
  return entries.map((entry) => entry.paragraphEn);
}
