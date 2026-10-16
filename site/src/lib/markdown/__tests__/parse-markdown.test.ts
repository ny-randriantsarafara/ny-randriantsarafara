import { describe, expect, it } from 'vitest';

import { parseInline, parseMarkdown } from '@/lib/markdown/parse-markdown.ts';

describe('parseMarkdown', () => {
  it('splits headings, paragraphs and lists', () => {
    const source = [
      '## Context',
      'A synthetic service',
      'spanning two lines.',
      '',
      '- First point',
      '- Second point',
      '',
      '1. Measure',
      '2) Decide',
    ].join('\n');
    expect(parseMarkdown(source)).toEqual([
      { type: 'heading', depth: 2, children: [{ type: 'text', text: 'Context' }] },
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'A synthetic service spanning two lines.' }],
      },
      {
        type: 'list',
        ordered: false,
        items: [[{ type: 'text', text: 'First point' }], [{ type: 'text', text: 'Second point' }]],
      },
      {
        type: 'list',
        ordered: true,
        items: [[{ type: 'text', text: 'Measure' }], [{ type: 'text', text: 'Decide' }]],
      },
    ]);
  });

  it('keeps an indented continuation inside its list item', () => {
    expect(parseMarkdown('* Item one\n  continues here\n* Item two')).toEqual([
      {
        type: 'list',
        ordered: false,
        items: [
          [{ type: 'text', text: 'Item one continues here' }],
          [{ type: 'text', text: 'Item two' }],
        ],
      },
    ]);
  });

  it('separates a heading from the text right under it', () => {
    expect(parseMarkdown('# Title\nBody\r\n+ Point')).toEqual([
      { type: 'heading', depth: 1, children: [{ type: 'text', text: 'Title' }] },
      { type: 'paragraph', children: [{ type: 'text', text: 'Body' }] },
      { type: 'list', ordered: false, items: [[{ type: 'text', text: 'Point' }]] },
    ]);
  });

  it('returns nothing for blank text', () => {
    expect(parseMarkdown('  \n\n ')).toEqual([]);
  });
});

describe('parseInline', () => {
  it('reads emphasis, strong text and code', () => {
    expect(parseInline('A **bold** and *light* `npm test` with __more__ and _less_.')).toEqual([
      { type: 'text', text: 'A ' },
      { type: 'strong', children: [{ type: 'text', text: 'bold' }] },
      { type: 'text', text: ' and ' },
      { type: 'emphasis', children: [{ type: 'text', text: 'light' }] },
      { type: 'text', text: ' ' },
      { type: 'code', text: 'npm test' },
      { type: 'text', text: ' with ' },
      { type: 'strong', children: [{ type: 'text', text: 'more' }] },
      { type: 'text', text: ' and ' },
      { type: 'emphasis', children: [{ type: 'text', text: 'less' }] },
      { type: 'text', text: '.' },
    ]);
  });

  it('leaves underscores inside words alone', () => {
    expect(parseInline('Set max_output_tokens here')).toEqual([
      { type: 'text', text: 'Set max_output_tokens here' },
    ]);
  });

  it('keeps markup inside code literal', () => {
    expect(parseInline('`**not bold**`')).toEqual([{ type: 'code', text: '**not bold**' }]);
  });

  it('links to web pages and email addresses', () => {
    expect(parseInline('[Docs](https://example.com/docs) or [mail](mailto:a@example.com)')).toEqual(
      [
        {
          type: 'link',
          href: 'https://example.com/docs',
          children: [{ type: 'text', text: 'Docs' }],
        },
        { type: 'text', text: ' or ' },
        { type: 'link', href: 'mailto:a@example.com', children: [{ type: 'text', text: 'mail' }] },
      ]
    );
  });

  it('drops the target of a script or relative link', () => {
    expect(
      parseInline('[run](javascript:alert(1)) [data](data:text/html,x) [rel](/admin)')
    ).toEqual([
      { type: 'text', text: 'run' },
      { type: 'text', text: ') ' },
      { type: 'text', text: 'data' },
      { type: 'text', text: ' ' },
      { type: 'text', text: 'rel' },
    ]);
  });

  it('treats raw HTML as text', () => {
    expect(parseInline('<img src=x onerror=alert(1)>')).toEqual([
      { type: 'text', text: '<img src=x onerror=alert(1)>' },
    ]);
  });
});
