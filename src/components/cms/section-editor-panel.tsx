'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { AboutEditor } from './editors/about-editor';
import { ContactEditor } from './editors/contact-editor';
import { HeroEditor } from './editors/hero-editor';
import { HowIWorkEditor } from './editors/how-i-work-editor';
import { MetadataEditor } from './editors/metadata-editor';
import { NavigationEditor } from './editors/navigation-editor';
import { ProjectsEditor } from './editors/projects-editor';
import { ProofEditor } from './editors/proof-editor';
import { SettingsEditor } from './editors/settings-editor';
import { SkillsEditor } from './editors/skills-editor';

import type { ContentKey } from '@/types';

interface SectionEditorPanelProps {
  sectionKey: ContentKey;
  initialData: unknown;
  onClose: () => void;
}

const EDITOR_TITLES: Record<ContentKey, string> = {
  metadata: 'Page Metadata',
  hero: 'Hero Section',
  proof: 'Proof Section',
  projects: 'Projects Section',
  skills: 'Skills Section',
  'how-i-work': 'How I Work Section',
  about: 'About Section',
  contact: 'Contact Section',
  navigation: 'Navigation',
  'site-settings': 'Site Settings',
};

export function SectionEditorPanel({ sectionKey, initialData, onClose }: SectionEditorPanelProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(
    async (data: unknown) => {
      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch(`/api/content/${sectionKey}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const body = (await response.json()) as { error: string };
          throw new Error(body.error ?? 'Failed to save');
        }

        router.refresh();
        onClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        setError(message);
      } finally {
        setIsSaving(false);
      }
    },
    [sectionKey, router, onClose]
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex h-full w-full max-w-lg flex-col overflow-hidden bg-paper shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
          <h2 className="text-lg font-semibold">{EDITOR_TITLES[sectionKey]}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-ink/60 hover:bg-ink/5 hover:text-ink"
            aria-label="Close editor"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <EditorForm
            sectionKey={sectionKey}
            initialData={initialData}
            onSave={handleSave}
            isSaving={isSaving}
          />
        </div>
      </div>
    </div>
  );
}

interface EditorFormProps {
  sectionKey: ContentKey;
  initialData: unknown;
  onSave: (data: unknown) => Promise<void>;
  isSaving: boolean;
}

function EditorForm({ sectionKey, initialData, onSave, isSaving }: EditorFormProps) {
  switch (sectionKey) {
    case 'hero':
      return <HeroEditor initialData={initialData} onSave={onSave} isSaving={isSaving} />;
    case 'proof':
      return <ProofEditor initialData={initialData} onSave={onSave} isSaving={isSaving} />;
    case 'projects':
      return <ProjectsEditor initialData={initialData} onSave={onSave} isSaving={isSaving} />;
    case 'skills':
      return <SkillsEditor initialData={initialData} onSave={onSave} isSaving={isSaving} />;
    case 'how-i-work':
      return <HowIWorkEditor initialData={initialData} onSave={onSave} isSaving={isSaving} />;
    case 'about':
      return <AboutEditor initialData={initialData} onSave={onSave} isSaving={isSaving} />;
    case 'contact':
      return <ContactEditor initialData={initialData} onSave={onSave} isSaving={isSaving} />;
    case 'navigation':
      return <NavigationEditor initialData={initialData} onSave={onSave} isSaving={isSaving} />;
    case 'metadata':
      return <MetadataEditor initialData={initialData} onSave={onSave} isSaving={isSaving} />;
    case 'site-settings':
      return <SettingsEditor initialData={initialData} onSave={onSave} isSaving={isSaving} />;
  }
}
