import type { ProfilePhotoManifest } from '@/lib/publication/profile-photo-manifest.ts';
import type { Locale, PublicationContent } from '@portfolio/content';

export type StarterQuestion = {
  question: string;
  answerSlug: string;
};

export type WelcomePhoto = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

export type WelcomeData = {
  name: string;
  headline: string;
  introductionLines: readonly [string, string];
  disclosure: string;
  starters: StarterQuestion[];
  initials: string;
  photo: WelcomePhoto | null;
};

function localizedText(text: { en: string; fr: string }, locale: Locale): string {
  return text[locale];
}

function initialsFromName(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length === 0) {
    return '?';
  }
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.at(-1)?.charAt(0) ?? first;
  return `${first}${last}`.toUpperCase();
}

function introductionLines(introduction: string): readonly [string, string] {
  const normalized = introduction.trim();
  const sentenceMatches = normalized.match(/[^.!?]+[.!?]?/g);
  if (sentenceMatches !== null && sentenceMatches.length >= 2) {
    const first = sentenceMatches[0]?.trim() ?? normalized;
    const second = sentenceMatches[1]?.trim() ?? '';
    return [first, second];
  }
  const midpoint = Math.ceil(normalized.length / 2);
  const spaceIndex = normalized.indexOf(' ', midpoint);
  if (spaceIndex > 0) {
    return [normalized.slice(0, spaceIndex).trim(), normalized.slice(spaceIndex).trim()];
  }
  return [normalized, ''];
}

function starterQuestions(content: PublicationContent, locale: Locale): StarterQuestion[] {
  return content.answers
    .filter((answer) => answer.starter)
    .slice(0, 4)
    .flatMap((answer) => {
      const sample = answer.sampleQuestions[locale][0];
      if (sample === undefined || sample.trim().length === 0) {
        return [];
      }
      return [{ question: sample, answerSlug: answer.slug }];
    });
}

function welcomePhoto(
  content: PublicationContent,
  locale: Locale,
  manifest: ProfilePhotoManifest | null
): WelcomePhoto | null {
  if (manifest === null || content.profile.photo === null) {
    return null;
  }
  return {
    src: manifest.src,
    width: manifest.width,
    height: manifest.height,
    alt: localizedText(content.profile.photo.alt, locale),
  };
}

export function buildWelcomeData(
  content: PublicationContent,
  locale: Locale,
  photoManifest: ProfilePhotoManifest | null
): WelcomeData {
  const profile = content.profile;
  return {
    name: profile.name,
    headline: localizedText(profile.headline, locale),
    introductionLines: introductionLines(localizedText(profile.introduction, locale)),
    disclosure: localizedText(profile.disclosure, locale),
    starters: starterQuestions(content, locale),
    initials: initialsFromName(profile.name),
    photo: welcomePhoto(content, locale, photoManifest),
  };
}
