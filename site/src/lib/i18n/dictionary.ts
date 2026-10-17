import type { Locale, SkillUsage } from '@portfolio/content';

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
    headlinePrefix: string;
    headlineHighlight: string;
    primaryCta: string;
    askCta: string;
    roleLabel: string;
    experienceLabel: string;
    coreSkillsLabel: string;
    contactLabel: string;
  };
  about: {
    eyebrow: string;
    headlinePrefix: string;
    headlineHighlight: string;
    capabilitiesTitle: string;
    technologiesTitle: string;
    usageHeader: string;
    technologiesHeader: string;
    usages: Record<SkillUsage, string>;
  };
  projects: {
    eyebrow: string;
    headlinePrefix: string;
    headlineHighlight: string;
    introduction: string;
  };
  experience: {
    eyebrow: string;
    headlinePrefix: string;
    headlineHighlight: string;
    technologiesLabel: string;
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
    description: string;
    channelsTitle: string;
    channelEmail: string;
    channelLinkedin: string;
    channelGithub: string;
  };
  footer: {
    backToTop: string;
    privacy: string;
  };
  privacy: {
    backToSite: string;
    alternateLanguage: string;
  };
  periods: {
    since: string;
    until: string;
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
  notFound: {
    title: string;
    description: string;
    homeLink: string;
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
      defaultTopic: string;
      messageLabel: string;
      submit: string;
      sending: string;
      sent: string;
      rateLimited: string;
      validationError: string;
      error: string;
      mailtoFallback: string;
      mailtoSubject: string;
      privacyNotice: string;
      privacyLink: string;
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
    work: 'Projects',
    experience: 'Background',
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
    primaryCta: 'View projects',
    askCta: 'Ask me a question',
    roleLabel: 'Role',
    experienceLabel: 'Experience',
    coreSkillsLabel: 'Core skills',
    contactLabel: 'Getting in touch',
  },
  about: {
    eyebrow: 'About',
    headlinePrefix: 'How',
    headlineHighlight: 'I got here',
    capabilitiesTitle: 'What I work on',
    technologiesTitle: 'Technologies',
    usageHeader: 'Use',
    technologiesHeader: 'Technologies',
    usages: {
      backend: 'Backend',
      aws: 'AWS services',
      data: 'Data',
      delivery: 'Tests and deployments',
      frontend: 'Frontend',
      tools: 'Tools and integrations',
    },
  },
  projects: {
    eyebrow: 'Professional projects',
    headlinePrefix: 'A few projects',
    headlineHighlight: 'to explore in detail',
    introduction:
      'Choose a project. We can talk about what I developed, the changes made or my role in the team.',
  },
  experience: {
    eyebrow: 'Background',
    headlinePrefix: 'Professional',
    headlineHighlight: 'experience',
    technologiesLabel: 'Technologies:',
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
    description:
      'Looking for someone to develop an API, take over a service or join your backend team? Send me a few lines about your project and what you have in mind.',
    channelsTitle: 'Contact details',
    channelEmail: 'Email',
    channelLinkedin: 'LinkedIn',
    channelGithub: 'GitHub',
  },
  footer: {
    backToTop: 'Back to top',
    privacy: 'Privacy policy',
  },
  privacy: {
    backToSite: 'Back to the portfolio',
    alternateLanguage: 'Français · confidentialité',
  },
  periods: {
    since: 'Since',
    until: 'to',
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
  notFound: {
    title: 'Page not found',
    description: 'This page is not available. Find my background and projects from the home page.',
    homeLink: 'Back to home',
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
    quickViewOpen: 'Classic view',
    quickViewClose: 'Back to chat mode',
    backToChat: 'Back to chat mode',
    conversationLabel: 'Conversation',
    stageLabel: 'Related experience and projects',
    suggestionsLabel: 'Shall we continue?',
    visitorLabel: 'Your question',
    assistantLabel: 'Answer',
    errorGeneric: 'The answer could not be loaded. Try again or open the classic view.',
    selectAnswer: 'View related items',
    contactForm: {
      title: 'Write to me',
      description: 'Tell me what you need or ask your question.',
      close: 'Close the form',
      nameLabel: 'Name',
      emailLabel: 'Email address',
      companyLabel: 'Company (optional)',
      topicLabel: 'Topic',
      defaultTopic: 'Getting in touch',
      messageLabel: 'Your message',
      submit: 'Send the message',
      sending: 'Sending…',
      sent: 'Thank you, your message has been sent.',
      rateLimited: 'The form is temporarily limited. Try again later or email me.',
      validationError: 'Check the information you entered, then try again.',
      error: 'Your message could not be sent. Try again or email me.',
      mailtoFallback: 'Email instead',
      mailtoSubject: 'Getting in touch',
      privacyNotice: 'The information you send is used to reply to you. See the',
      privacyLink: 'privacy policy',
    },
    blocks: {
      timeline: 'Background',
      experience: 'Experience',
      project: 'Project',
      skills: 'Skills',
      keyFigures: 'Key figures',
      strengths: 'Strengths',
      contact: 'Contact details',
      cv: 'My CV',
      caseStudy: 'The project in detail',
      contactPrompt: 'Tell me what you need by email, on LinkedIn or with the form.',
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
    primaryCta: 'Voir les projets',
    askCta: 'Me poser une question',
    roleLabel: 'Métier',
    experienceLabel: 'Expérience',
    coreSkillsLabel: 'Compétences principales',
    contactLabel: 'Prise de contact',
  },
  about: {
    eyebrow: 'À propos',
    headlinePrefix: 'Comment',
    headlineHighlight: 'j’en suis arrivé là',
    capabilitiesTitle: 'Les sujets sur lesquels je travaille',
    technologiesTitle: 'Technologies',
    usageHeader: 'Usage',
    technologiesHeader: 'Technologies',
    usages: {
      backend: 'Backend',
      aws: 'Services AWS',
      data: 'Données',
      delivery: 'Tests et déploiements',
      frontend: 'Frontend',
      tools: 'Outils et intégrations',
    },
  },
  projects: {
    eyebrow: 'Projets professionnels',
    headlinePrefix: 'Quelques projets',
    headlineHighlight: 'pour entrer dans le détail',
    introduction:
      'Choisissez un projet. On peut parler de ce que j’y ai développé, des changements apportés ou de mon rôle dans l’équipe.',
  },
  experience: {
    eyebrow: 'Parcours',
    headlinePrefix: 'Expériences',
    headlineHighlight: 'professionnelles',
    technologiesLabel: 'Technologies :',
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
    description:
      'Vous cherchez quelqu’un pour développer une API, reprendre un service ou rejoindre votre équipe backend ? Écrivez-moi quelques lignes sur votre projet et ce que vous avez en tête.',
    channelsTitle: 'Coordonnées',
    channelEmail: 'E-mail',
    channelLinkedin: 'LinkedIn',
    channelGithub: 'GitHub',
  },
  footer: {
    backToTop: 'Retour en haut',
    privacy: 'Politique de confidentialité',
  },
  privacy: {
    backToSite: 'Retour au portfolio',
    alternateLanguage: 'English · privacy',
  },
  periods: {
    since: 'Depuis',
    until: 'à',
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
  notFound: {
    title: 'Page introuvable',
    description:
      'Cette page n’est pas disponible. Retrouvez mon parcours et mes projets depuis l’accueil.',
    homeLink: 'Retour à l’accueil',
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
    quickViewOpen: 'Vue classique',
    quickViewClose: 'Retour au mode chat',
    backToChat: 'Retour au mode chat',
    conversationLabel: 'Fil de conversation',
    stageLabel: 'Expériences et projets associés',
    suggestionsLabel: 'On continue ?',
    visitorLabel: 'Votre question',
    assistantLabel: 'Réponse',
    errorGeneric: 'La réponse n’a pas pu être chargée. Réessayez ou consultez la vue classique.',
    selectAnswer: 'Voir les éléments associés',
    contactForm: {
      title: 'M’écrire',
      description: 'Présentez votre besoin ou posez votre question.',
      close: 'Fermer le formulaire',
      nameLabel: 'Nom',
      emailLabel: 'Adresse e-mail',
      companyLabel: 'Entreprise (facultatif)',
      topicLabel: 'Sujet',
      defaultTopic: 'Prise de contact',
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
      privacyNotice: 'Les informations envoyées servent à vous répondre. Consultez la',
      privacyLink: 'politique de confidentialité',
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

export const dictionaries: Record<Locale, Dictionary> = {
  en: english,
  fr: french,
};

export function dictionaryFor(locale: Locale): Dictionary {
  return dictionaries[locale];
}
