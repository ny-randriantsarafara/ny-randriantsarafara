import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MarkdownText } from '@/components/ui/markdown-text.tsx';

const syntheticCaseStudy = [
  '# Problem',
  'A **synthetic** service answered slowly.',
  '',
  '## Steps',
  '- Measured with `k6`',
  '- Read the [guide](https://example.com/guide)',
  '',
  '<script>alert(1)</script> [bad](javascript:alert(1))',
].join('\n');

describe('MarkdownText', () => {
  it('renders headings below the given level, lists, emphasis and code', () => {
    render(<MarkdownText source={syntheticCaseStudy} headingLevel={5} />);
    expect(screen.getByRole('heading', { level: 5, name: 'Problem' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 6, name: 'Steps' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('synthetic').tagName).toBe('STRONG');
    expect(screen.getByText('k6').tagName).toBe('CODE');
  });

  it('opens safe links in a new tab without the opener', () => {
    render(<MarkdownText source={syntheticCaseStudy} headingLevel={5} />);
    const link = screen.getByRole('link', { name: 'guide' });
    expect(link).toHaveAttribute('href', 'https://example.com/guide');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('shows raw HTML as text instead of running it', () => {
    const { container } = render(<MarkdownText source={syntheticCaseStudy} headingLevel={5} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container).toHaveTextContent('<script>alert(1)</script> bad)');
  });

  it('caps deep headings at h6', () => {
    render(<MarkdownText source="#### Deep" headingLevel={5} />);
    expect(screen.getByRole('heading', { level: 6, name: 'Deep' })).toBeInTheDocument();
  });
});
