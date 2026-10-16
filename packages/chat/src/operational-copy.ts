import type { Locale } from '@portfolio/content';

export function unavailableText(locale: Locale): string {
  if (locale === 'fr') {
    return 'La conversation est momentanément indisponible. Vous pouvez consulter les informations publiées dans la vue d’ensemble.';
  }
  return 'The conversation is temporarily unavailable. You can browse the published information in the quick view.';
}

export function clarificationText(locale: Locale, subject: string | null): string {
  if (subject === null) {
    if (locale === 'fr') {
      return 'Pouvez-vous préciser l’expérience ou le projet dont vous parlez ?';
    }
    return 'Which experience or project should I focus on?';
  }
  if (locale === 'fr') {
    return `Que souhaitez-vous savoir sur ${subject} ?`;
  }
  return `What would you like to know about ${subject}?`;
}
