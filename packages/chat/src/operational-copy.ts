import type { Locale } from '@portfolio/content';

export function unavailableText(locale: Locale): string {
  if (locale === 'fr') {
    return 'La conversation est momentanément indisponible. Vous pouvez consulter les informations publiées dans la vue d’ensemble.';
  }
  return 'The conversation is temporarily unavailable. You can browse the published information in the overview.';
}

export function rephraseText(locale: Locale): string {
  if (locale === 'fr') {
    return 'Je n’ai pas de réponse sûre à cette question telle qu’elle est posée. Pouvez-vous la reformuler ou la préciser ?';
  }
  return 'I don’t have a reliable answer to that question as asked. Could you rephrase it or make it more specific?';
}

export function cvReplyText(locale: Locale): string {
  if (locale === 'fr') {
    return 'Voici mon CV. Vous pouvez aussi me contacter pour une précision sur mon parcours.';
  }
  return 'Here is my CV. You can also contact me for more detail about my background.';
}

export function contactReplyText(locale: Locale): string {
  if (locale === 'fr') {
    return 'Voici comment me contacter.';
  }
  return 'Here is how to contact me.';
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
