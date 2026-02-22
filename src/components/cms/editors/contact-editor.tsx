'use client';

import { useState } from 'react';

import { ListManager, SaveButton, TextArea, TextInput } from './form-fields';

import type { ContactSection } from '@/types';

interface ContactEditorProps {
  initialData: unknown;
  onSave: (data: unknown) => Promise<void>;
  isSaving: boolean;
}

export function ContactEditor({ initialData, onSave, isSaving }: ContactEditorProps) {
  const section = initialData as ContactSection;
  const [data, setData] = useState(section.data);

  const update = <K extends keyof typeof data>(key: K, value: (typeof data)[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => onSave({ ...section, data });

  return (
    <div className="space-y-4">
      <TextInput label="Title" value={data.title} onChange={(v) => update('title', v)} />
      <TextArea
        label="Description"
        value={data.description}
        onChange={(v) => update('description', v)}
      />

      <ListManager
        label="Links"
        items={data.links}
        onChange={(v) => update('links', v)}
        createItem={() => ({ label: '', href: '' })}
        renderItem={(link, _i, upd) => (
          <div className="space-y-2">
            <TextInput
              label="Label"
              value={link.label}
              onChange={(v) => upd({ ...link, label: v })}
            />
            <TextInput label="Href" value={link.href} onChange={(v) => upd({ ...link, href: v })} />
          </div>
        )}
      />

      <div className="rounded-lg border border-ink/10 p-3">
        <span className="mb-2 block text-xs font-medium text-ink/60">Footer</span>
        <div className="space-y-2">
          <TextInput
            label="Copyright"
            value={data.footer.copyright}
            onChange={(v) => update('footer', { ...data.footer, copyright: v })}
          />
          <TextInput
            label="Tagline"
            value={data.footer.tagline}
            onChange={(v) => update('footer', { ...data.footer, tagline: v })}
          />
        </div>
      </div>

      <SaveButton isSaving={isSaving} onClick={handleSave} />
    </div>
  );
}
