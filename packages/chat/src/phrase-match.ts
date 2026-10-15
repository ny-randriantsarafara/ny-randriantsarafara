import { removeAccents } from './normalize.ts';

// Whole words and phrases only, ignoring case, accents and punctuation:
// "when can you start" must not match "when did you start", nor "pay" match "payment".
export function toPaddedWords(text: string): string {
  const words = removeAccents(text.toLowerCase())
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  return ` ${words} `;
}

export function containsPhrase(paddedText: string, paddedPhrase: string): boolean {
  return paddedPhrase.trim().length > 0 && paddedText.includes(paddedPhrase);
}
