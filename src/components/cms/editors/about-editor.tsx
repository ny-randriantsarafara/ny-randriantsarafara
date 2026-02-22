'use client';

import { useState } from 'react';

import { ListManager, SaveButton, StringList, TextInput } from './form-fields';

import type { AboutSection } from '@/types';

interface AboutEditorProps {
  initialData: unknown;
  onSave: (data: unknown) => Promise<void>;
  isSaving: boolean;
}

export function AboutEditor({ initialData, onSave, isSaving }: AboutEditorProps) {
  const section = initialData as AboutSection;
  const [data, setData] = useState(section.data);

  const update = <K extends keyof typeof data>(key: K, value: (typeof data)[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => onSave({ ...section, data });

  return (
    <div className="space-y-4">
      <TextInput label="Title" value={data.title} onChange={(v) => update('title', v)} />

      <StringList
        label="Paragraphs"
        items={data.paragraphs}
        onChange={(v) => update('paragraphs', v)}
      />

      <ListManager
        label="Quick details"
        items={data.quickDetails}
        onChange={(v) => update('quickDetails', v)}
        createItem={() => ({ label: '', value: '' })}
        renderItem={(detail, _i, upd) => (
          <div className="space-y-2">
            <TextInput
              label="Label"
              value={detail.label}
              onChange={(v) => upd({ ...detail, label: v })}
            />
            <TextInput
              label="Value"
              value={detail.value}
              onChange={(v) => upd({ ...detail, value: v })}
            />
          </div>
        )}
      />

      <div className="rounded-lg border border-ink/10 p-3">
        <span className="mb-2 block text-xs font-medium text-ink/60">Signature</span>
        <div className="space-y-2">
          <TextInput
            label="Label"
            value={data.signature.label}
            onChange={(v) => update('signature', { ...data.signature, label: v })}
          />
          <TextInput
            label="Text"
            value={data.signature.text}
            onChange={(v) => update('signature', { ...data.signature, text: v })}
          />
        </div>
      </div>

      <SaveButton isSaving={isSaving} onClick={handleSave} />
    </div>
  );
}
