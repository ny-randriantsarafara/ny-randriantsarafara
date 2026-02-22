'use client';

import { useState } from 'react';

import { SaveButton, TextInput } from './form-fields';

import type { SiteSettingsData } from '@/types';

interface SettingsEditorProps {
  initialData: unknown;
  onSave: (data: unknown) => Promise<void>;
  isSaving: boolean;
}

export function SettingsEditor({ initialData, onSave, isSaving }: SettingsEditorProps) {
  const [data, setData] = useState(initialData as SiteSettingsData);

  const updateField = <K extends keyof SiteSettingsData>(key: K, value: SiteSettingsData[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const updateLabel = <K extends keyof SiteSettingsData['labels']>(
    key: K,
    value: SiteSettingsData['labels'][K]
  ) => setData((prev) => ({ ...prev, labels: { ...prev.labels, [key]: value } }));

  const handleSave = () => onSave(data);

  return (
    <div className="space-y-4">
      <TextInput
        label="Brand name"
        value={data.brandName}
        onChange={(v) => updateField('brandName', v)}
      />
      <TextInput
        label="Role text"
        value={data.roleText}
        onChange={(v) => updateField('roleText', v)}
      />
      <TextInput
        label="CTA button text"
        value={data.ctaText}
        onChange={(v) => updateField('ctaText', v)}
      />

      <div className="rounded-lg border border-ink/10 p-3">
        <span className="mb-3 block text-xs font-medium text-ink/60">Labels</span>
        <div className="space-y-3">
          <TextInput
            label="Trusted by"
            value={data.labels.trustedBy}
            onChange={(v) => updateLabel('trustedBy', v)}
          />
          <TextInput
            label="Quick details heading"
            value={data.labels.quickDetails}
            onChange={(v) => updateLabel('quickDetails', v)}
          />
          <TextInput
            label="Scroll decorative text"
            value={data.labels.scrollBreathVerify}
            onChange={(v) => updateLabel('scrollBreathVerify', v)}
          />
          <TextInput
            label="Practice heading"
            value={data.labels.practiceHeading}
            onChange={(v) => updateLabel('practiceHeading', v)}
          />
          <TextInput
            label="Tech label"
            value={data.labels.techLabel}
            onChange={(v) => updateLabel('techLabel', v)}
          />
          <TextInput
            label="Philosophy line 1"
            value={data.labels.philosophyLine1}
            onChange={(v) => updateLabel('philosophyLine1', v)}
          />
          <TextInput
            label="Philosophy line 2"
            value={data.labels.philosophyLine2}
            onChange={(v) => updateLabel('philosophyLine2', v)}
          />
          <TextInput
            label="Skip to content text"
            value={data.labels.skipToContent}
            onChange={(v) => updateLabel('skipToContent', v)}
          />
          <TextInput
            label="Location text"
            value={data.labels.locationText}
            onChange={(v) => updateLabel('locationText', v)}
          />
        </div>
      </div>

      <SaveButton isSaving={isSaving} onClick={handleSave} />
    </div>
  );
}
