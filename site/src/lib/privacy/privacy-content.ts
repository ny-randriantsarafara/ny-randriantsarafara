import { CHAT_MODEL_PROCESSOR_NAME } from './processors.ts';

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
          'Anonymous audience statistics (page views, navigation within the site, device class and marketing tags when present) support a single purpose: understanding how the portfolio is used. The design follows the CNIL exemption for audience measurement: no cookies, no cross-site tracking, daily-rotating salt for visitor counts, no storage of IP addresses.',
          'Chat questions are stored without identifying the visitor, to improve answers and spot gaps in the answer bank.',
          'Contact form messages (name, email, optional company and message) are stored so the owner can reply.',
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
          'Raw audience events and chat exchange rows are kept for thirteen months, then deleted. Daily aggregate statistics are kept without a time limit (they contain no personal data). Contact messages are kept for three years after the last exchange with the same person. Search Console import rows contain no personal data and are kept without a time limit.',
        ],
      },
      {
        heading: 'Processors',
        paragraphs: [
          `${CHAT_MODEL_PROCESSOR_NAME} processes chat questions to generate answers (questions only, no contact data).`,
          'Google sends email notifications when a contact message arrives (SMTP).',
          'OVHcloud hosts the VPS running the API and Directus.',
          'GitHub hosts the static site.',
          'Cloudflare stores encrypted backups of production data.',
        ],
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
          'Des statistiques d’audience anonymes (pages vues, navigation sur le site, type d’appareil, paramètres UTM le cas échéant) servent un seul objectif : comprendre l’usage du portfolio. La mesure respecte l’ exemption CNIL « mesure d’audience » : pas de cookies, pas de recoupement intersites, sel aléatoire renouvelé chaque jour pour compter les visiteurs, aucune conservation d’adresse IP.',
          'Les questions posées au chat sont enregistrées sans identifier le visiteur, pour améliorer les réponses et repérer les lacunes de la banque de réponses.',
          'Les messages du formulaire de contact (nom, e-mail, entreprise optionnelle, message) sont conservés pour permettre une réponse.',
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
          'Les événements d’audience bruts et les échanges de chat sont conservés treize mois, puis supprimés. Les agrégats journaliers sont conservés sans limite (sans données personnelles). Les messages de contact sont conservés trois ans après le dernier échange avec la même personne. Les lignes Search Console ne contiennent pas de données personnelles et sont conservées sans limite.',
        ],
      },
      {
        heading: 'Sous-traitants',
        paragraphs: [
          `${CHAT_MODEL_PROCESSOR_NAME} traite les questions du chat pour produire les réponses (questions uniquement, pas de données de contact).`,
          'Google envoie les notifications e-mail lors d’un message de contact (SMTP).',
          'OVHcloud héberge le VPS qui exécute l’API et Directus.',
          'GitHub héberge le site statique.',
          'Cloudflare stocke les sauvegardes chiffrées des données de production.',
        ],
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
