import { contentFixture } from '@portfolio/content/testing';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BlockRenderer } from '@/components/chat/block-renderer.tsx';
import { dictionaryFor } from '@/lib/i18n/dictionary.ts';

import type { PublicationContent } from '@portfolio/content';

describe('BlockRenderer', () => {
  it('skips unknown experience slugs silently', () => {
    render(
      <BlockRenderer
        blocks={[{ type: 'experience', slug: 'missing' }, { type: 'cv' }]}
        content={contentFixture}
        locale="en"
        dictionary={dictionaryFor('en')}
        conversationId="3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42"
        turnId="turn-1"
      />
    );
    expect(screen.getByRole('link', { name: /download my cv/i })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /experience/i })).not.toBeInTheDocument();
  });

  it('renders a case study as Markdown under the case study heading', () => {
    const content: PublicationContent = {
      ...contentFixture,
      projects: contentFixture.projects.map((project) => {
        if (project.slug !== 'visa-insight') {
          return project;
        }
        return {
          ...project,
          caseStudy: {
            en: '## Synthetic context\n- First step\n- Second step',
            fr: '## Contexte synthétique\n- Première étape',
          },
        };
      }),
    };
    render(
      <BlockRenderer
        blocks={[{ type: 'project', slug: 'visa-insight' }]}
        content={content}
        locale="fr"
        dictionary={dictionaryFor('fr')}
        conversationId="3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42"
        turnId="turn-2"
      />
    );
    expect(screen.getByRole('heading', { level: 4 })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 6, name: 'Contexte synthétique' })
    ).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent('Première étape');
  });

  it('names the owner of a key figure next to its label', () => {
    render(
      <BlockRenderer
        blocks={[{ type: 'key-figures', slugs: ['years-experience', 'coverage-achieved'] }]}
        content={contentFixture}
        locale="en"
        dictionary={dictionaryFor('en')}
        conversationId="3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42"
        turnId="turn-3"
      />
    );
    const coverageLabel = contentFixture.keyFigures.find(
      (figure) => figure.slug === 'coverage-achieved'
    )?.label.en;
    const yearsLabel = contentFixture.keyFigures.find(
      (figure) => figure.slug === 'years-experience'
    )?.label.en;
    expect(screen.getByText(`${coverageLabel} · ITRAS Group`)).toBeInTheDocument();
    expect(screen.getByText(`${yearsLabel}`)).toBeInTheDocument();
  });
});
