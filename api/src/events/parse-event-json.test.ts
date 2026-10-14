import { describe, expect, it } from 'vitest';

import { parseEventJsonFromText } from './parse-event-json.ts';

describe('parseEventJsonFromText', () => {
  it('parses JSON objects from plain text bodies', () => {
    expect(parseEventJsonFromText('{"type":"page_view","path":"/","locale":"en"}')).toEqual({
      type: 'page_view',
      path: '/',
      locale: 'en',
    });
  });

  it('returns null for empty or invalid JSON', () => {
    expect(parseEventJsonFromText('   ')).toBeNull();
    expect(parseEventJsonFromText('not-json')).toBeNull();
  });
});
