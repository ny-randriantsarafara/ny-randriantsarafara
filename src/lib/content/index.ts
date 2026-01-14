// Main service
export { contentService, createContentService } from './service';

// Providers
export { StaticContentProvider } from './providers';

// Types
export type { ContentConfig, ContentProvider } from './types';

// Helpers
export {
  extractAboutSection,
  extractContactSection,
  extractHeroSection,
  extractHowIWorkSection,
  extractProjectsSection,
  extractProofSection,
  extractSection,
  extractSections,
  extractSkillsSection,
  isSectionType,
} from './helpers';
