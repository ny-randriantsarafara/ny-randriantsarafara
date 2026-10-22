import { processorParagraphs } from './processors.ts';

import type { Locale } from '@portfolio/content';

export type PrivacySection = {
  heading: string;
  paragraphs: readonly string[];
};

export type PrivacyDocument = {
  title: string;
  description: string;
  sections: readonly PrivacySection[];
  rightsContact: string;
};

type Controller = {
  name: string;
  email: string;
};

export function privacyDocument(locale: Locale, controller: Controller): PrivacyDocument {
  if (locale === 'fr') {
    return frenchDocument(controller);
  }
  return englishDocument(controller);
}

function englishDocument(controller: Controller): PrivacyDocument {
  return {
    title: 'Privacy',
    description:
      'How this portfolio measures anonymous audience use, records chat questions and handles contact messages.',
    sections: [
      {
        heading: 'Controller',
        paragraphs: [
          `${controller.name} is the data controller for this site. Questions about this notice: ${controller.email}.`,
        ],
      },
      {
        heading: 'What is collected and why',
        paragraphs: [
          'Anonymous audience statistics (page views, navigation within the site, device class and marketing tags when present) support a single purpose: understanding how the portfolio is used. Visits on one page load are linked in page memory with a random journey identifier that is not stored in the browser after you leave; a full reload starts a new journey. The design follows the CNIL exemption for audience measurement: no cookies, no cross-site tracking, daily-rotating salt for visitor counts, no storage of IP addresses.',
          'Chat questions are stored without identifying the visitor, to improve answers and spot gaps in the answer bank. Assistant answers kept for analytics are redacted on the server; if the browser shows a local fallback reply, a separate redacted copy of that fallback text may be recorded.',
          'Contact form messages (name, email, optional company and message) are stored so the owner can reply.',
          'Your manual language preference is saved in local storage on your device (portfolio.locale), solely to remember your choice; it is not used for tracking.',
          'When no saved choice or supported browser language is available, our server may send your IP address to Country (country.is) to infer a country and choose a default language. Our server does not store or log the IP address or country for this lookup; if it fails, English is used.',
          'Theme preference (light or dark) is saved in local storage on your device because you explicitly choose it; it is not used for tracking.',
        ],
      },
      {
        heading: 'What is never collected',
        paragraphs: [
          'IP addresses are not stored. No advertising or cross-site trackers run on this site. No analytics cookies are set.',
        ],
      },
      {
        heading: 'Retention',
        paragraphs: [
          'Detailed redacted analytics (audience events, linked journey records and chat exchange rows) are deleted thirteen calendar months after they are recorded. Daily aggregate statistics are kept without limit (they contain no personal data). Contact messages are deleted three years after they were last updated. Search Console import rows are kept without limit; they contain no personal data.',
        ],
      },
      {
        heading: 'Processors',
        paragraphs: processorParagraphs('en'),
      },
      {
        heading: 'Your choices and rights',
        paragraphs: [
          'Global Privacy Control and Do Not Track are honoured: when your browser sends those signals, audience events are not recorded.',
          'Under the GDPR you may request access, rectification or erasure where applicable, or object to processing. Contact the controller at the address above.',
        ],
      },
    ],
    rightsContact: `Contact: ${controller.email}`,
  };
}

function frenchDocument(controller: Controller): PrivacyDocument {
  return {
    title: 'Confidentialité',
    description:
      'Mesure d’audience anonyme, enregistrement des questions au chat et messages de contact sur ce portfolio.',
    sections: [
      {
        heading: 'Responsable du traitement',
        paragraphs: [
          `${controller.name} est responsable du traitement pour ce site. Pour toute question sur cette notice : ${controller.email}.`,
        ],
      },
      {
        heading: 'Données collectées et finalités',
        paragraphs: [
          'Des statistiques d’audience anonymes (pages vues, navigation sur le site, type d’appareil, paramètres UTM le cas échéant) servent un seul objectif : comprendre l’usage du portfolio. Les actions d’une même visite sont reliées en mémoire de page par un identifiant de parcours aléatoire, non conservé dans le navigateur après votre départ ; un rechargement complet démarre un nouveau parcours. La mesure respecte l’exemption CNIL « mesure d’audience » : pas de cookies, pas de recoupement intersites, sel aléatoire renouvelé chaque jour pour compter les visiteurs, aucune conservation d’adresse IP.',
          'Les questions posées au chat sont enregistrées sans identifier le visiteur, pour améliorer les réponses et repérer les lacunes de la banque de réponses. Les réponses de l’assistant conservées pour l’analyse sont redigées côté serveur ; si le navigateur affiche une réponse de secours locale, une copie redigée distincte de ce texte peut être enregistrée.',
          'Les messages du formulaire de contact (nom, e-mail, entreprise optionnelle, message) sont conservés pour permettre une réponse.',
          'Votre choix manuel de langue est enregistré dans le stockage local de votre appareil (portfolio.locale), uniquement pour mémoriser ce choix ; il ne sert pas au suivi.',
          'En l’absence de choix enregistré et de langue de navigateur prise en charge, notre serveur peut transmettre votre adresse IP à Country (country.is) pour déduire un pays et choisir la langue par défaut. Notre serveur ne conserve ni ne journalise l’adresse IP et le pays pour cette recherche ; en cas d’échec, l’anglais est utilisé.',
          'Le choix de thème (clair ou sombre) est enregistré dans le stockage local de votre appareil parce que vous le choisissez explicitement ; il n’est pas utilisé pour le suivi.',
        ],
      },
      {
        heading: 'Ce qui n’est jamais collecté',
        paragraphs: [
          'Les adresses IP ne sont pas stockées. Aucun traceur publicitaire ou intersites n’est exécuté sur ce site. Aucun cookie analytique n’est déposé.',
        ],
      },
      {
        heading: 'Durées de conservation',
        paragraphs: [
          'Les analyses détaillées redigées (événements d’audience, parcours liés et échanges de chat) sont supprimées treize mois calendaires après leur enregistrement. Les agrégats journaliers sont conservés sans limite (sans données personnelles). Les messages de contact sont supprimés trois ans après leur dernière mise à jour. Les lignes Search Console sont conservées sans limite ; elles ne contiennent pas de données personnelles.',
        ],
      },
      {
        heading: 'Sous-traitants',
        paragraphs: processorParagraphs('fr'),
      },
      {
        heading: 'Vos choix et droits',
        paragraphs: [
          'Global Privacy Control et Do Not Track sont respectés : lorsque votre navigateur envoie ces signaux, aucun événement d’audience n’est enregistré.',
          'Au titre du RGPD, vous pouvez demander l’accès, la rectification ou l’effacement lorsque applicable, ou vous opposer au traitement. Contactez le responsable à l’adresse ci-dessus.',
        ],
      },
    ],
    rightsContact: `Contact : ${controller.email}`,
  };
}
