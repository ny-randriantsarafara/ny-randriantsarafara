import type { BlockType } from '@portfolio/content';

import type { ChatOutcome } from '../src/contract.ts';
import type { Locale } from '../src/contract.ts';

export type EvalCase = {
  locale: Locale;
  question: string;
  expectedOutcome: ChatOutcome;
  expectedAnswerSlug: string | null;
  expectedBlockTypes: BlockType[];
};
