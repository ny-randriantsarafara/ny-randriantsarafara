import type { Locale } from './localized.ts';
import type { Skill } from './publication.ts';

export function skillName(skill: Skill, locale: Locale): string {
  if (locale === 'fr' && skill.frenchName !== null) {
    return skill.frenchName;
  }
  return skill.name;
}

// Every name a visitor may use for the skill.
export function skillAliases(skill: Skill): string[] {
  if (skill.frenchName === null) {
    return [skill.name];
  }
  return [skill.name, skill.frenchName];
}
