'use client';

import { useState } from 'react';

import { ListManager, SaveButton, TextArea, TextInput } from './form-fields';

import type { SkillsSection } from '@/types';

interface SkillsEditorProps {
  initialData: unknown;
  onSave: (data: unknown) => Promise<void>;
  isSaving: boolean;
}

export function SkillsEditor({ initialData, onSave, isSaving }: SkillsEditorProps) {
  const section = initialData as SkillsSection;
  const [data, setData] = useState(section.data);

  const update = <K extends keyof typeof data>(key: K, value: (typeof data)[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => onSave({ ...section, data });

  return (
    <div className="space-y-4">
      <TextInput label="Title" value={data.title} onChange={(v) => update('title', v)} />
      <TextInput label="Subtitle" value={data.subtitle} onChange={(v) => update('subtitle', v)} />

      <ListManager
        label="Skills"
        items={data.skills}
        onChange={(v) => update('skills', v)}
        createItem={() => ({ title: '', description: '', details: '' })}
        renderItem={(skill, _i, upd) => (
          <div className="space-y-2">
            <TextInput
              label="Title"
              value={skill.title}
              onChange={(v) => upd({ ...skill, title: v })}
            />
            <TextArea
              label="Description"
              value={skill.description}
              onChange={(v) => upd({ ...skill, description: v })}
            />
            <TextArea
              label="Details"
              value={skill.details}
              onChange={(v) => upd({ ...skill, details: v })}
            />
          </div>
        )}
      />

      <SaveButton isSaving={isSaving} onClick={handleSave} />
    </div>
  );
}
