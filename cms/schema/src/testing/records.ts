import type { PublicationContent } from '@portfolio/content';

import { toWorkingRecords } from '../mapping.ts';
import type { WorkingRecords } from '../mapping.ts';

export function storedRecordsOf(content: PublicationContent): WorkingRecords {
  const records = toWorkingRecords(content);
  return {
    profile: { id: 1, ...records.profile },
    capabilities: records.capabilities.map((record, index) => ({ id: `c${index}`, ...record })),
    skills: records.skills.map((record, index) => ({ id: `s${index}`, ...record })),
    experiences: records.experiences.map((record, index) => ({ id: `e${index}`, ...record })),
    projects: records.projects.map((record, index) => ({ id: `p${index}`, ...record })),
    keyFigures: records.keyFigures.map((record, index) => ({ id: `k${index}`, ...record })),
    answers: records.answers.map((record, index) => ({ id: `a${index}`, ...record })),
    chatSettings: { id: 1, ...records.chatSettings },
    siteSettings: { id: 1, ...records.siteSettings },
  };
}
