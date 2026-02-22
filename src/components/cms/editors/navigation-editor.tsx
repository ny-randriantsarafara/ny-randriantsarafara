'use client';

import { useState } from 'react';

import { ListManager, SaveButton, TextInput } from './form-fields';

import type { NavigationData } from '@/types';

interface NavigationEditorProps {
  initialData: unknown;
  onSave: (data: unknown) => Promise<void>;
  isSaving: boolean;
}

export function NavigationEditor({ initialData, onSave, isSaving }: NavigationEditorProps) {
  const [data, setData] = useState(initialData as NavigationData);

  const handleSave = () => onSave(data);

  return (
    <div className="space-y-4">
      <ListManager
        label="Navigation links"
        items={data.links}
        onChange={(links) => setData({ links })}
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

      <SaveButton isSaving={isSaving} onClick={handleSave} />
    </div>
  );
}
