'use client';

import { useState } from 'react';

import { SaveButton, StringList, TextArea, TextInput } from './form-fields';

import type { HowIWorkSection } from '@/types';

interface HowIWorkEditorProps {
  initialData: unknown;
  onSave: (data: unknown) => Promise<void>;
  isSaving: boolean;
}

export function HowIWorkEditor({ initialData, onSave, isSaving }: HowIWorkEditorProps) {
  const section = initialData as HowIWorkSection;
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

      <StringList
        label="Principles"
        items={data.principles}
        onChange={(v) => update('principles', v)}
      />

      <TextInput
        label="Signature"
        value={data.signature}
        onChange={(v) => update('signature', v)}
      />

      <SaveButton isSaving={isSaving} onClick={handleSave} />
    </div>
  );
}
