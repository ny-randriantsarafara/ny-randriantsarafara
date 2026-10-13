import { describe, expect, it } from 'vitest';

import { PublicationSelectionError } from '../errors.ts';
import { readSelectedPublicationId } from './trigger.ts';

describe('readSelectedPublicationId', () => {
  it('reads the single selected publication from the manual trigger', () => {
    expect(
      readSelectedPublicationId({
        $trigger: { body: { collection: 'publications', keys: ['publication-1'] } },
      })
    ).toBe('publication-1');
  });

  it.each([
    ['no trigger', {}],
    ['no body', { $trigger: {} }],
    ['no keys', { $trigger: { body: { collection: 'publications' } } }],
    ['several publications', { $trigger: { body: { keys: ['publication-1', 'publication-2'] } } }],
    ['a numeric key', { $trigger: { body: { keys: [42] } } }],
    ['an empty key', { $trigger: { body: { keys: [''] } } }],
  ])('rejects %s', (_case, flowData) => {
    expect(() => readSelectedPublicationId(flowData)).toThrow(PublicationSelectionError);
  });
});
