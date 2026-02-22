'use client';

import { useState } from 'react';

import { ListManager, SaveButton, StringList, TextInput } from './form-fields';

import type { ProofSection } from '@/types';

interface ProofEditorProps {
  initialData: unknown;
  onSave: (data: unknown) => Promise<void>;
  isSaving: boolean;
}

export function ProofEditor({ initialData, onSave, isSaving }: ProofEditorProps) {
  const section = initialData as ProofSection;
  const [data, setData] = useState(section.data);

  const update = <K extends keyof typeof data>(key: K, value: (typeof data)[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => onSave({ ...section, data });

  return (
    <div className="space-y-4">
      <TextInput label="Title" value={data.title} onChange={(v) => update('title', v)} />
      <TextInput label="Subtitle" value={data.subtitle} onChange={(v) => update('subtitle', v)} />

      <ListManager
        label="Metrics"
        items={data.metrics}
        onChange={(v) => update('metrics', v)}
        createItem={() => ({ value: '', label: '', detail: '' })}
        renderItem={(metric, _i, upd) => (
          <div className="space-y-2">
            <TextInput
              label="Value"
              value={metric.value}
              onChange={(v) => upd({ ...metric, value: v })}
            />
            <TextInput
              label="Label"
              value={metric.label}
              onChange={(v) => upd({ ...metric, label: v })}
            />
            <TextInput
              label="Detail"
              value={metric.detail}
              onChange={(v) => upd({ ...metric, detail: v })}
            />
          </div>
        )}
      />

      <StringList
        label="Practice items"
        items={data.practiceItems}
        onChange={(v) => update('practiceItems', v)}
      />

      <SaveButton isSaving={isSaving} onClick={handleSave} />
    </div>
  );
}
