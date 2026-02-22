'use client';

import { useState } from 'react';

import { SaveButton, TextArea, TextInput } from './form-fields';

import type { PageMetadata } from '@/types';

interface MetadataEditorProps {
  initialData: unknown;
  onSave: (data: unknown) => Promise<void>;
  isSaving: boolean;
}

export function MetadataEditor({ initialData, onSave, isSaving }: MetadataEditorProps) {
  const [data, setData] = useState(initialData as PageMetadata);

  const update = <K extends keyof PageMetadata>(key: K, value: PageMetadata[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => onSave(data);

  return (
    <div className="space-y-4">
      <TextInput label="Page title" value={data.title} onChange={(v) => update('title', v)} />
      <TextArea
        label="Description"
        value={data.description}
        onChange={(v) => update('description', v)}
      />
      <TextInput
        label="Theme color"
        value={data.themeColor ?? ''}
        onChange={(v) => update('themeColor', v || undefined)}
      />

      <SaveButton isSaving={isSaving} onClick={handleSave} />
    </div>
  );
}
