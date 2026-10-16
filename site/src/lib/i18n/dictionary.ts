import type { Locale } from '@portfolio/content';

export type Dictionary = {
  skipLink: string;
  nav: {
    home: string;
    about: string;
    work: string;
    experience: string;
    contact: string;
    ariaLabel: string;
  };
  theme: {
    switchToLight: string;
    switchToDark: string;
  };
  language: {
    switchLabel: string;
    targetName: string;
  };
  hero: {
    description: string;
    headlinePrefix: string;
    headlineHighlight: string;
    headlineSuffix: string;
    primaryCta: string;
    secondaryCta: string;
    focusLabel: string;
    stackLabel: string;
  };
  about: {
    journeyText: string;
    eyebrow: string;
    headlinePrefix: string;
    headlineHighlight: string;
    headlineSuffix: string;
    journeyTitle: string;
    coreStackTitle: string;
  };
  projects: {
    eyebrow: string;
    headlinePrefix: string;
    headlineHighlight: string;
    footnote: string;
  };
  experience: {
    eyebrow: string;
    headlinePrefix: string;
    headlineHighlight: string;
    description: string;
  };
  initiatives: {
    eyebrow: string;
    headlinePrefix: string;
    headlineHighlight: string;
    description: string;
  };
  contact: {
    description: string;
    eyebrow: string;
    headlinePrefix: string;
    headlineHighlight: string;
    cta: string;
    locationLabel: string;
    languagesLabel: string;
    statusLabel: string;
    channelEmail: string;
    channelLinkedin: string;
    channelGithub: string;
  };
  footer: {
    tagline: string;
    backToTop: string;
    privacy: string;
  };
  privacy: {
    backToSite: string;
    alternateLanguage: string;
  };
  periods: {
    present: string;
  };
  cv: {
    profile: string;
    experience: string;
    projects: string;
    skills: string;
    keyFigures: string;
    contact: string;
    personalProjects: string;
  };
  og: {
    title: string;
    tagline: string;
  };
  notFound: {
    title: string;
    description: string;
    frenchLine: string;
    homeLink: string;
    frenchLink: string;
  };
  chat: {
    startersHeading: string;
    inputPlaceholder: string;
    send: string;
    sending: string;
    charLimit: string;
    disclosureLabel: string;
    privacyNotice: string;
    privacyLinkSlot: string;
    fallbackNotice: string;
    scriptedNotice: string;
    quickViewOpen: string;
    quickViewClose: string;
    backToChat: string;
    conversationLabel: string;
    stageLabel: string;
    suggestionsLabel: string;
    visitorLabel: string;
    assistantLabel: string;
    errorGeneric: string;
    selectAnswer: string;
    contactForm: {
      title: string;
      description: string;
      close: string;
      nameLabel: string;
      emailLabel: string;
      companyLabel: string;
      topicLabel: string;
      messageLabel: string;
      submit: string;
      sending: string;
      sent: string;
      rateLimited: string;
      validationError: string;
      error: string;
      mailtoFallback: string;
      mailtoSubject: string;
    };
    blocks: {
      timeline: string;
      experience: string;
      project: string;
      skills: string;
      keyFigures: string;
      strengths: string;
      contact: string;
      cv: string;
      caseStudy: string;
      contactPrompt: string;
      openContact: string;
      downloadCv: string;
    };
  };
};

const english: Dictionary = {
  skipLink: 'Skip to content',
  nav: {
    home: 'Home',
    about: 'About',
    work: 'Work',
    experience: 'Experience',
    contact: 'Contact',
    ariaLabel: 'Primary',
  },
  theme: {
    switchToLight: 'Switch to light mode',
    switchToDark: 'Switch to dark mode',
  },
  language: {
    switchLabel: 'Switch to French',
    targetName: 'French',
  },
  hero: {
    headlinePrefix: 'Let’s talk',
    headlineHighlight: 'backend.',
    headlineSuffix: '',
    primaryCta: 'View projects',
    secondaryCta: 'Download my CV',
    focusLabel: 'Role',
    stackLabel: 'Technologies',
    description:
      'I develop APIs and services with Node.js, TypeScript and AWS. My assignments have also involved improving existing code, migrating data and preparing production releases.\n\nYou’ll find my projects and background here. If a topic interests you, ask a question to find out more.',
  },
  about: {
    eyebrow: 'About',
    headlinePrefix: 'How',
    headlineHighlight: 'I got here',
    headlineSuffix: '',
    journeyTitle: 'My background',
    coreStackTitle: 'Core skills',
    journeyText:
      'I started software development in 2018 with Java and Spring Boot. I then worked on React and Angular applications before focusing on backend development with Node.js, TypeScript and AWS services.\n\nAt Euronews, I migrated JavaScript components to TypeScript and strengthened tests. Today, at Eurosport, I develop content APIs and serverless workflows. I also designed and carried out the migration of image data to Aurora PostgreSQL.\n\nI was also a Lead Developer at Numer and a part-time teacher at HEI. At Numer, I coordinated mobile, back-office and landing-page development. At HEI, I taught a few hours a week alongside development.',
  },
  projects: {
    eyebrow: 'Professional projects',
    headlinePrefix: 'A few projects',
    headlineHighlight: 'to explore in detail',
    footnote:
      'Choose a project. We can talk about what I developed, the changes made or my role in the team.',
  },
  experience: {
    eyebrow: 'Background',
    headlinePrefix: 'Professional',
    headlineHighlight: 'experience',
    description: 'Software development since 2018',
  },
  initiatives: {
    eyebrow: 'R&D & engineering initiatives',
    headlinePrefix: 'Side',
    headlineHighlight: 'investments',
    description: 'Personal R&D in NLP/AI, geospatial systems, and cloud orchestration.',
  },
  contact: {
    eyebrow: 'Contact',
    headlinePrefix: 'Shall we talk',
    headlineHighlight: 'about your project?',
    cta: 'Write to me',
    locationLabel: 'Location',
    languagesLabel: 'Languages',
    statusLabel: 'Status',
    channelEmail: 'Email',
    channelLinkedin: 'LinkedIn',
    channelGithub: 'GitHub',
    description:
      'Looking for someone to develop an API, improve a service or join your backend team? Send me a few lines about your project and what you have in mind.',
  },
  footer: {
    tagline: 'Built with care.',
    backToTop: 'Back to top',
    privacy: 'Privacy policy',
  },
  privacy: {
    backToSite: 'Back to the portfolio',
    alternateLanguage: 'Français · confidentialité',
  },
  periods: {
    present: 'Present',
  },
  cv: {
    profile: 'Profile',
    experience: 'Experience',
    projects: 'Professional projects',
    skills: 'Skills',
    keyFigures: 'Key figures',
    contact: 'Contact',
    personalProjects: 'Personal projects',
  },
  og: {
    tagline:
      'Projects at Eurosport and Euronews, from code to production. Ask a question to explore my background and contributions.',
    title: 'Ny Hasinavalona | Let’s talk backend',
  },
  notFound: {
    title: 'Page not found',
    description: 'This page is unavailable. Explore my background and projects from the home page.',
    frenchLine: 'Page introuvable.',
    homeLink: 'Back to home',
    frenchLink: 'Version française',
  },
  chat: {
    startersHeading: 'Where shall we start?',
    inputPlaceholder: 'What would you like to know?',
    send: 'Send',
    sending: 'Answering…',
    charLimit: 'characters left',
    disclosureLabel: 'About this assistant',
    privacyNotice:
      'Questions are recorded to improve the portfolio. Avoid including personal information.',
    privacyLinkSlot: 'Privacy policy',
    fallbackNotice:
      'The conversation service is temporarily unavailable. This answer comes from the portfolio content.',
    scriptedNotice: 'Answer from the portfolio content.',
    quickViewOpen: 'Overview',
    quickViewClose: 'Back to the conversation',
    backToChat: 'Back to the conversation',
    conversationLabel: 'Conversation',
    stageLabel: 'Related experience and projects',
    suggestionsLabel: 'Shall we continue?',
    visitorLabel: 'Your question',
    assistantLabel: 'Answer',
    errorGeneric: 'The answer could not be loaded. Try again or explore the overview.',
    selectAnswer: 'View related items',
    contactForm: {
      title: 'Write to me',
      description: 'Tell me what you need or ask your question.',
      close: 'Close form',
      nameLabel: 'Name',
      emailLabel: 'Email address',
      companyLabel: 'Company (optional)',
      topicLabel: 'Topic',
      messageLabel: 'Message',
      submit: 'Send message',
      sending: 'Sending…',
      sent: 'Thank you, your message has been sent.',
      rateLimited: 'The form is temporarily limited. Try again later or email me.',
      validationError: 'Check the information you entered, then try again.',
      error: 'Your message could not be sent. Try again or email me.',
      mailtoFallback: 'Email instead',
      mailtoSubject: 'Getting in touch',
    },
    blocks: {
      timeline: 'Background',
      experience: 'Experience',
      project: 'Project',
      skills: 'Skills',
      keyFigures: 'Key figures',
      strengths: 'Strengths',
      contact: 'Contact',
      cv: 'My CV',
      caseStudy: 'Project details',
      contactPrompt: 'Tell me what you need by email, on LinkedIn or using the form.',
      openContact: 'Contact form',
      downloadCv: 'Download my CV',
    },
  },
};

const french: Dictionary = {
  skipLink: 'Aller au contenu',
  nav: {
    home: 'Accueil',
    about: 'À propos',
    work: 'Projets',
    experience: 'Parcours',
    contact: 'Contact',
    ariaLabel: 'Navigation principale',
  },
  theme: {
    switchToLight: 'Passer en mode clair',
    switchToDark: 'Passer en mode sombre',
  },
  language: {
    switchLabel: 'Passer en anglais',
    targetName: 'English',
  },
  hero: {
    headlinePrefix: 'Parlons',
    headlineHighlight: 'backend.',
    headlineSuffix: '',
    primaryCta: 'Voir les projets',
    secondaryCta: 'Télécharger mon CV',
    focusLabel: 'Métier',
    stackLabel: 'Technologies',
    description:
      'Je développe des API et des services avec Node.js, TypeScript et AWS. Mes missions m’ont aussi amené à reprendre du code existant, migrer des données et préparer des mises en production.\n\nVous trouverez ici mes projets et mon parcours. Si un sujet vous intéresse, posez une question pour en savoir plus.',
  },
  about: {
    eyebrow: 'À propos',
    headlinePrefix: 'Comment',
    headlineHighlight: 'j’en suis arrivé là',
    headlineSuffix: '',
    journeyTitle: 'Mon parcours',
    coreStackTitle: 'Compétences principales',
    journeyText:
      'J’ai commencé le développement logiciel en 2018, avec Java et Spring Boot. J’ai ensuite travaillé sur des applications React et Angular, avant de me concentrer sur le backend avec Node.js, TypeScript et les services AWS.\n\nChez Euronews, j’ai repris des composants JavaScript pour les passer en TypeScript et renforcé les tests. Aujourd’hui, chez Eurosport, je développe des API de contenu et des workflows serverless. J’y ai aussi conçu et réalisé la migration des données d’images vers Aurora PostgreSQL.\n\nJ’ai également été Lead Developer chez Numer et enseignant à temps partiel chez HEI. Chez Numer, je coordonnais les développements mobile, back-office et pages de présentation. Chez HEI, j’assurais quelques heures d’enseignement par semaine en parallèle de mon activité de développement.',
  },
  projects: {
    eyebrow: 'Projets professionnels',
    headlinePrefix: 'Quelques projets',
    headlineHighlight: 'pour entrer dans le détail',
    footnote:
      'Choisissez un projet. On peut parler de ce que j’y ai développé, des changements apportés ou de mon rôle dans l’équipe.',
  },
  experience: {
    eyebrow: 'Parcours',
    headlinePrefix: 'Expériences',
    headlineHighlight: 'professionnelles',
    description: 'Développement logiciel depuis 2018',
  },
  initiatives: {
    eyebrow: 'R&D et initiatives',
    headlinePrefix: 'Investissements',
    headlineHighlight: 'personnels',
    description: 'R&D personnelle en NLP/IA, systèmes géospatiaux et orchestration cloud.',
  },
  contact: {
    eyebrow: 'Contact',
    headlinePrefix: 'Et si on parlait',
    headlineHighlight: 'de votre projet ?',
    cta: 'M’écrire',
    locationLabel: 'Localisation',
    languagesLabel: 'Langues',
    statusLabel: 'Statut',
    channelEmail: 'E-mail',
    channelLinkedin: 'LinkedIn',
    channelGithub: 'GitHub',
    description:
      'Vous cherchez quelqu’un pour développer une API, reprendre un service ou rejoindre votre équipe backend ? Écrivez-moi quelques lignes sur votre projet et ce que vous avez en tête.',
  },
  footer: {
    tagline: 'Construit avec soin.',
    backToTop: 'Retour en haut',
    privacy: 'Politique de confidentialité',
  },
  privacy: {
    backToSite: 'Retour au portfolio',
    alternateLanguage: 'English · privacy',
  },
  periods: {
    present: 'aujourd’hui',
  },
  cv: {
    profile: 'Profil',
    experience: 'Expérience',
    projects: 'Projets professionnels',
    skills: 'Compétences',
    keyFigures: 'Chiffres clés',
    contact: 'Contact',
    personalProjects: 'Projets personnels',
  },
  og: {
    tagline:
      'Des projets chez Eurosport et Euronews, du code à la production. Posez une question pour explorer mon parcours et mes contributions.',
    title: 'Ny Hasinavalona | Parlons backend',
  },
  notFound: {
    title: 'Page introuvable',
    description:
      'Cette page n’est pas disponible. Retrouvez mon parcours et mes projets depuis l’accueil.',
    frenchLine: 'Page introuvable.',
    homeLink: 'Retour à l’accueil',
    frenchLink: 'English version',
  },
  chat: {
    startersHeading: 'On commence par quoi ?',
    inputPlaceholder: 'Qu’est-ce que vous aimeriez savoir ?',
    send: 'Envoyer',
    sending: 'Réponse en cours…',
    charLimit: 'caractères restants',
    disclosureLabel: 'À propos de cet assistant',
    privacyNotice:
      'Les questions sont enregistrées pour améliorer le portfolio. Évitez d’y inclure des informations personnelles.',
    privacyLinkSlot: 'Politique de confidentialité',
    fallbackNotice:
      'Le service de conversation est momentanément indisponible. Cette réponse provient du contenu du portfolio.',
    scriptedNotice: 'Réponse issue du contenu du portfolio.',
    quickViewOpen: 'Vue d’ensemble',
    quickViewClose: 'Retour à la conversation',
    backToChat: 'Retour à la conversation',
    conversationLabel: 'Conversation',
    stageLabel: 'Expériences et projets associés',
    suggestionsLabel: 'On continue ?',
    visitorLabel: 'Votre question',
    assistantLabel: 'Réponse',
    errorGeneric: 'La réponse n’a pas pu être chargée. Réessayez ou consultez la vue d’ensemble.',
    selectAnswer: 'Voir les éléments associés',
    contactForm: {
      title: 'M’écrire',
      description: 'Présentez votre besoin ou posez votre question.',
      close: 'Fermer le formulaire',
      nameLabel: 'Nom',
      emailLabel: 'Adresse e-mail',
      companyLabel: 'Entreprise (facultatif)',
      topicLabel: 'Sujet',
      messageLabel: 'Votre message',
      submit: 'Envoyer le message',
      sending: 'Envoi en cours…',
      sent: 'Merci, votre message a bien été envoyé.',
      rateLimited:
        'Le formulaire est temporairement limité. Réessayez plus tard ou écrivez-moi par e-mail.',
      validationError: 'Vérifiez les informations saisies, puis réessayez.',
      error: 'Votre message n’a pas pu être envoyé. Réessayez ou écrivez-moi par e-mail.',
      mailtoFallback: 'Écrire par e-mail',
      mailtoSubject: 'Prise de contact',
    },
    blocks: {
      timeline: 'Parcours',
      experience: 'Expérience',
      project: 'Projet',
      skills: 'Compétences',
      keyFigures: 'Chiffres clés',
      strengths: 'Points forts',
      contact: 'Coordonnées',
      cv: 'Mon CV',
      caseStudy: 'Le projet en détail',
      contactPrompt: 'Présentez-moi votre besoin par e-mail, sur LinkedIn ou avec le formulaire.',
      openContact: 'Formulaire de contact',
      downloadCv: 'Télécharger mon CV',
    },
  },
};

export const dictionaries: Record<Locale, Dictionary> = { en: english, fr: french };

export function dictionaryFor(locale: Locale): Dictionary {
  return dictionaries[locale];
}
