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
    suggestionLink: string;
  };
  hero: {
    headlinePrefix: string;
    headlineHighlight: string;
    headlineSuffix: string;
    primaryCta: string;
    secondaryCta: string;
    focusLabel: string;
    stackLabel: string;
  };
  about: {
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
    suggestionLink: 'Version française',
  },
  hero: {
    headlinePrefix: 'Crafting cloud systems',
    headlineHighlight: 'built to last',
    headlineSuffix: 'not to impress.',
    primaryCta: 'Explore work',
    secondaryCta: 'Resume',
    focusLabel: 'Focus',
    stackLabel: 'Stack',
  },
  about: {
    eyebrow: 'About',
    headlinePrefix: 'Bridging',
    headlineHighlight: 'reliability and clarity',
    headlineSuffix: 'in cloud systems.',
    journeyTitle: 'My journey',
    coreStackTitle: 'Core stack',
  },
  projects: {
    eyebrow: 'Featured work',
    headlinePrefix: 'Selected',
    headlineHighlight: 'case studies',
    footnote: 'Detailed case studies available on request.',
  },
  experience: {
    eyebrow: 'Career path',
    headlinePrefix: 'Professional',
    headlineHighlight: 'experience',
    description:
      'Design-then-implement delivery across global media, scale-ups, and distributed teams.',
  },
  initiatives: {
    eyebrow: 'R&D & engineering initiatives',
    headlinePrefix: 'Side',
    headlineHighlight: 'investments',
    description: 'Personal R&D in NLP/AI, geospatial systems, and cloud orchestration.',
  },
  contact: {
    eyebrow: 'Next steps',
    headlinePrefix: "Let's work",
    headlineHighlight: 'together',
    cta: 'Get in touch',
    locationLabel: 'Location',
    languagesLabel: 'Languages',
    statusLabel: 'Status',
    channelEmail: 'Email',
    channelLinkedin: 'LinkedIn',
    channelGithub: 'GitHub',
  },
  footer: {
    tagline: 'Built with care.',
    backToTop: 'Back to top',
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
    tagline: 'Senior backend and cloud engineering',
  },
  notFound: {
    title: 'Page not found',
    description: 'The page you requested does not exist on this site.',
    frenchLine: 'Page introuvable.',
    homeLink: 'Back to home',
    frenchLink: 'Version française',
  },
  chat: {
    startersHeading: 'Try asking',
    inputPlaceholder: 'Ask about my experience, projects, or how I work…',
    send: 'Send',
    sending: 'Answering…',
    charLimit: 'characters left',
    disclosureLabel: 'AI disclosure',
    privacyNotice: 'Questions are recorded anonymously to improve answers.',
    privacyLinkSlot: 'Privacy policy',
    fallbackNotice: 'Answered locally while the chat service is unavailable.',
    quickViewOpen: 'Quick view',
    quickViewClose: 'Back to chat',
    backToChat: 'Back to chat',
    conversationLabel: 'Conversation',
    stageLabel: 'Related content',
    suggestionsLabel: 'Follow-up questions',
    visitorLabel: 'Your question',
    assistantLabel: 'Answer',
    errorGeneric: 'Something went wrong. Please try again.',
    selectAnswer: 'Show related content for this answer',
    blocks: {
      timeline: 'Career timeline',
      experience: 'Experience',
      project: 'Project',
      skills: 'Skills',
      keyFigures: 'Key figures',
      strengths: 'Strengths',
      contact: 'Contact',
      cv: 'CV',
      caseStudy: 'Case study',
      contactPrompt: 'Reach out directly or open the contact form.',
      openContact: 'Contact form',
      downloadCv: 'Download CV',
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
    suggestionLink: 'Version française',
  },
  hero: {
    headlinePrefix: 'Des systèmes cloud',
    headlineHighlight: 'faits pour durer',
    headlineSuffix: 'pas pour impressionner.',
    primaryCta: 'Voir les projets',
    secondaryCta: 'CV',
    focusLabel: 'Axe principal',
    stackLabel: 'Technologies',
  },
  about: {
    eyebrow: 'À propos',
    headlinePrefix: 'Relier',
    headlineHighlight: 'fiabilité et clarté',
    headlineSuffix: 'dans le cloud.',
    journeyTitle: 'Mon parcours',
    coreStackTitle: 'Stack principal',
  },
  projects: {
    eyebrow: 'Travaux sélectionnés',
    headlinePrefix: 'Études de cas',
    headlineHighlight: 'marquantes',
    footnote: 'Études de cas détaillées sur demande.',
  },
  experience: {
    eyebrow: 'Parcours',
    headlinePrefix: 'Expérience',
    headlineHighlight: 'professionnelle',
    description:
      'Livraison design-then-implement dans la media internationale, les scale-ups et les équipes distribuées.',
  },
  initiatives: {
    eyebrow: 'R&D et initiatives',
    headlinePrefix: 'Investissements',
    headlineHighlight: 'personnels',
    description: 'R&D personnelle en NLP/IA, systèmes géospatiaux et orchestration cloud.',
  },
  contact: {
    eyebrow: 'Prochaines étapes',
    headlinePrefix: 'Travaillons',
    headlineHighlight: 'ensemble',
    cta: 'Me contacter',
    locationLabel: 'Localisation',
    languagesLabel: 'Langues',
    statusLabel: 'Statut',
    channelEmail: 'E-mail',
    channelLinkedin: 'LinkedIn',
    channelGithub: 'GitHub',
  },
  footer: {
    tagline: 'Construit avec soin.',
    backToTop: 'Retour en haut',
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
    tagline: 'Ingénierie backend et cloud senior',
  },
  notFound: {
    title: 'Page introuvable',
    description: 'La page demandée n’existe pas sur ce site.',
    frenchLine: 'Page introuvable.',
    homeLink: 'Retour à l’accueil',
    frenchLink: 'English version',
  },
  chat: {
    startersHeading: 'Exemples de questions',
    inputPlaceholder: 'Posez une question sur mon parcours, mes projets ou ma façon de travailler…',
    send: 'Envoyer',
    sending: 'Réponse en cours…',
    charLimit: 'caractères restants',
    disclosureLabel: 'Information sur l’IA',
    privacyNotice: 'Les questions sont enregistrées de façon anonyme pour améliorer les réponses.',
    privacyLinkSlot: 'Politique de confidentialité',
    fallbackNotice: 'Réponse locale tant que le service de chat est indisponible.',
    quickViewOpen: 'Vue d’ensemble',
    quickViewClose: 'Retour au chat',
    backToChat: 'Retour au chat',
    conversationLabel: 'Fil de conversation',
    stageLabel: 'Contenu associé',
    suggestionsLabel: 'Questions suivantes',
    visitorLabel: 'Votre question',
    assistantLabel: 'Réponse',
    errorGeneric: 'Un problème est survenu. Réessayez.',
    selectAnswer: 'Afficher le contenu associé à cette réponse',
    blocks: {
      timeline: 'Frise chronologique',
      experience: 'Expérience',
      project: 'Projet',
      skills: 'Compétences',
      keyFigures: 'Chiffres clés',
      strengths: 'Points forts',
      contact: 'Coordonnées',
      cv: 'Curriculum vitae',
      caseStudy: 'Étude de cas',
      contactPrompt: 'Contactez-moi directement ou ouvrez le formulaire.',
      openContact: 'Formulaire de contact',
      downloadCv: 'Télécharger le CV',
    },
  },
};

export const dictionaries: Record<Locale, Dictionary> = {
  en: english,
  fr: french,
};

export function dictionaryFor(locale: Locale): Dictionary {
  return dictionaries[locale];
}
