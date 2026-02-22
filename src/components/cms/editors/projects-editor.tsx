'use client';

import { useState } from 'react';

import { ListManager, SaveButton, StringList, TextArea, TextInput } from './form-fields';

import type { ProjectsSection } from '@/types';

interface ProjectsEditorProps {
  initialData: unknown;
  onSave: (data: unknown) => Promise<void>;
  isSaving: boolean;
}

export function ProjectsEditor({ initialData, onSave, isSaving }: ProjectsEditorProps) {
  const section = initialData as ProjectsSection;
  const [data, setData] = useState(section.data);

  const update = <K extends keyof typeof data>(key: K, value: (typeof data)[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => onSave({ ...section, data });

  return (
    <div className="space-y-4">
      <TextInput label="Title" value={data.title} onChange={(v) => update('title', v)} />
      <TextInput label="Subtitle" value={data.subtitle} onChange={(v) => update('subtitle', v)} />

      <ListManager
        label="Projects"
        items={data.projects}
        onChange={(v) => update('projects', v)}
        createItem={() => ({ title: '', description: '', tech: [] })}
        renderItem={(project, _i, upd) => (
          <div className="space-y-2">
            <TextInput
              label="Title"
              value={project.title}
              onChange={(v) => upd({ ...project, title: v })}
            />
            <TextArea
              label="Description"
              value={project.description}
              onChange={(v) => upd({ ...project, description: v })}
            />
            <StringList
              label="Tech stack"
              items={project.tech}
              onChange={(v) => upd({ ...project, tech: v })}
            />
            <TextInput
              label="Note (optional)"
              value={project.note ?? ''}
              onChange={(v) => upd({ ...project, note: v || undefined })}
            />
          </div>
        )}
      />

      <SaveButton isSaving={isSaving} onClick={handleSave} />
    </div>
  );
}
