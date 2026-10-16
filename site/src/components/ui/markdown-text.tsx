import { createElement } from 'react';

import {
  parseMarkdown,
  type MarkdownBlock,
  type MarkdownInline,
} from '@/lib/markdown/parse-markdown.ts';

type HeadingTag = 'h3' | 'h4' | 'h5' | 'h6';

const HEADING_TAGS: readonly HeadingTag[] = ['h3', 'h4', 'h5', 'h6'];

// Rendered as React elements only: the source can never inject markup or scripts.
export function MarkdownText({
  source,
  headingLevel,
  className,
}: {
  source: string;
  // Level of the source's top headings, below the heading of the section it sits in.
  headingLevel: 3 | 4 | 5 | 6;
  className?: string;
}) {
  const blocks = parseMarkdown(source);
  return (
    <div className={className}>
      {blocks.map((block, index) => (
        <MarkdownBlockView key={index} block={block} headingLevel={headingLevel} />
      ))}
    </div>
  );
}

function MarkdownBlockView({
  block,
  headingLevel,
}: {
  block: MarkdownBlock;
  headingLevel: 3 | 4 | 5 | 6;
}) {
  switch (block.type) {
    case 'heading':
      return createElement(
        headingTag(headingLevel + block.depth - 1),
        { className: 'mt-3 font-semibold first:mt-0', style: { color: 'var(--text-secondary)' } },
        <InlineNodes nodes={block.children} />
      );
    case 'paragraph':
      return (
        <p className="mt-2 first:mt-0">
          <InlineNodes nodes={block.children} />
        </p>
      );
    case 'list': {
      const items = block.items.map((item, index) => (
        <li key={index}>
          <InlineNodes nodes={item} />
        </li>
      ));
      if (block.ordered) {
        return <ol className="mt-2 list-decimal space-y-1 pl-5 first:mt-0">{items}</ol>;
      }
      return <ul className="mt-2 list-disc space-y-1 pl-5 first:mt-0">{items}</ul>;
    }
  }
}

function headingTag(level: number): HeadingTag {
  const index = Math.min(Math.max(level, 3), 6) - 3;
  return HEADING_TAGS[index] ?? 'h6';
}

function InlineNodes({ nodes }: { nodes: readonly MarkdownInline[] }) {
  return nodes.map((node, index) => <InlineNode key={index} node={node} />);
}

function InlineNode({ node }: { node: MarkdownInline }) {
  switch (node.type) {
    case 'text':
      return node.text;
    case 'strong':
      return (
        <strong>
          <InlineNodes nodes={node.children} />
        </strong>
      );
    case 'emphasis':
      return (
        <em>
          <InlineNodes nodes={node.children} />
        </em>
      );
    case 'code':
      return <code className="rounded px-1 text-[0.9em]">{node.text}</code>;
    case 'link':
      return (
        <a href={node.href} className="underline" rel="noopener noreferrer" target="_blank">
          <InlineNodes nodes={node.children} />
        </a>
      );
  }
}
