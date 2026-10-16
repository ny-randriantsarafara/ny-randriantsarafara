// The Markdown a Directus editor writes in a case study: headings, paragraphs, lists, emphasis,
// inline code and links. Anything else, raw HTML included, stays plain text.
export type MarkdownInline =
  | { type: 'text'; text: string }
  | { type: 'strong'; children: MarkdownInline[] }
  | { type: 'emphasis'; children: MarkdownInline[] }
  | { type: 'code'; text: string }
  | { type: 'link'; href: string; children: MarkdownInline[] };

export type MarkdownBlock =
  | { type: 'heading'; depth: number; children: MarkdownInline[] }
  | { type: 'paragraph'; children: MarkdownInline[] }
  | { type: 'list'; ordered: boolean; items: MarkdownInline[][] };

type LineKind = 'heading' | 'unordered' | 'ordered' | 'text';
type LineRun = { kind: LineKind; lines: string[] };

const HEADING_LINE = /^(#{1,6})\s+(.*)$/;
const UNORDERED_ITEM = /^\s*[-*+]\s+(.*)$/;
const ORDERED_ITEM = /^\s*\d+[.)]\s+(.*)$/;
const INDENTED = /^\s+\S/;
const INLINE_MARKUP =
  /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|\*\*(.+?)\*\*|__(.+?)__|\*(\S(?:.*?\S)?)\*|(?<![\p{L}\p{N}])_(\S(?:.*?\S)?)_(?![\p{L}\p{N}])/u;
const SAFE_LINK = /^(?:https?:\/\/|mailto:)/i;

export function parseMarkdown(source: string): MarkdownBlock[] {
  return source
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .flatMap((chunk) => lineRuns(chunk).map((run) => runBlock(run)));
}

function lineRuns(chunk: string): LineRun[] {
  const lines = chunk.split('\n').filter((line) => line.trim().length > 0);
  return lines.reduce<LineRun[]>((runs, line) => {
    const kind = lineKind(line);
    const last = runs.at(-1);
    if (last === undefined) {
      return [{ kind, lines: [line] }];
    }
    if (isListKind(last.kind) && kind === 'text' && INDENTED.test(line)) {
      return [...runs.slice(0, -1), withLastLineContinued(last, line)];
    }
    if (kind === last.kind && kind !== 'heading') {
      return [...runs.slice(0, -1), { kind, lines: [...last.lines, line] }];
    }
    return [...runs, { kind, lines: [line] }];
  }, []);
}

function lineKind(line: string): LineKind {
  if (HEADING_LINE.test(line)) {
    return 'heading';
  }
  if (UNORDERED_ITEM.test(line)) {
    return 'unordered';
  }
  if (ORDERED_ITEM.test(line)) {
    return 'ordered';
  }
  return 'text';
}

function isListKind(kind: LineKind): boolean {
  return kind === 'unordered' || kind === 'ordered';
}

function withLastLineContinued(run: LineRun, continuation: string): LineRun {
  const previous = run.lines.slice(0, -1);
  const last = run.lines.at(-1) ?? '';
  return { kind: run.kind, lines: [...previous, `${last} ${continuation.trim()}`] };
}

function runBlock(run: LineRun): MarkdownBlock {
  switch (run.kind) {
    case 'heading':
      return headingBlock(run.lines[0] ?? '');
    case 'unordered':
      return listBlock(run.lines, UNORDERED_ITEM, false);
    case 'ordered':
      return listBlock(run.lines, ORDERED_ITEM, true);
    case 'text':
      return { type: 'paragraph', children: parseInline(joinLines(run.lines)) };
  }
}

function headingBlock(line: string): MarkdownBlock {
  const match = HEADING_LINE.exec(line);
  const marks = match?.[1] ?? '#';
  return { type: 'heading', depth: marks.length, children: parseInline(match?.[2]?.trim() ?? '') };
}

function listBlock(lines: readonly string[], itemPattern: RegExp, ordered: boolean): MarkdownBlock {
  const items = lines.map((line) => parseInline(itemPattern.exec(line)?.[1]?.trim() ?? line));
  return { type: 'list', ordered, items };
}

function joinLines(lines: readonly string[]): string {
  return lines.map((line) => line.trim()).join(' ');
}

export function parseInline(text: string): MarkdownInline[] {
  const match = INLINE_MARKUP.exec(text);
  if (match === null) {
    return textNodes(text);
  }
  const before = text.slice(0, match.index);
  const after = text.slice(match.index + match[0].length);
  return [...textNodes(before), inlineNode(match), ...parseInline(after)];
}

function inlineNode(match: RegExpExecArray): MarkdownInline {
  const [, code, linkText, href, strongStars, strongUnderscores, emphasisStar, emphasisUnderscore] =
    match;
  if (code !== undefined) {
    return { type: 'code', text: code };
  }
  if (linkText !== undefined && href !== undefined) {
    return linkNode(linkText, href);
  }
  const strong = strongStars ?? strongUnderscores;
  if (strong !== undefined) {
    return { type: 'strong', children: parseInline(strong) };
  }
  return { type: 'emphasis', children: parseInline(emphasisStar ?? emphasisUnderscore ?? '') };
}

// A link to anything but a web page or an email address keeps its text and loses its target.
function linkNode(text: string, href: string): MarkdownInline {
  if (!SAFE_LINK.test(href)) {
    return { type: 'text', text };
  }
  return { type: 'link', href, children: parseInline(text) };
}

function textNodes(text: string): MarkdownInline[] {
  if (text.length === 0) {
    return [];
  }
  return [{ type: 'text', text }];
}
