'use client';

import { useState } from 'react';

import { ListManager, SaveButton, StringList, TextArea, TextInput } from './form-fields';

import type { HeroSection } from '@/types';

interface HeroEditorProps {
  initialData: unknown;
  onSave: (data: unknown) => Promise<void>;
  isSaving: boolean;
}

export function HeroEditor({ initialData, onSave, isSaving }: HeroEditorProps) {
  const section = initialData as HeroSection;
  const [data, setData] = useState(section.data);

  const update = <K extends keyof typeof data>(key: K, value: (typeof data)[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const updateSnapshot = <K extends keyof typeof data.snapshot>(
    key: K,
    value: (typeof data.snapshot)[K]
  ) => setData((prev) => ({ ...prev, snapshot: { ...prev.snapshot, [key]: value } }));

  const handleSave = () => onSave({ ...section, data });

  return (
    <div className="space-y-4">
      <TextInput label="Tagline" value={data.tagline} onChange={(v) => update('tagline', v)} />
      <TextArea label="Headline" value={data.headline} onChange={(v) => update('headline', v)} />
      <TextInput
        label="Highlighted text"
        value={data.highlightedText}
        onChange={(v) => update('highlightedText', v)}
      />
      <TextArea
        label="Subheadline"
        value={data.subheadline}
        onChange={(v) => update('subheadline', v)}
        rows={4}
      />

      <div className="rounded-lg border border-ink/10 p-3">
        <span className="mb-2 block text-xs font-medium text-ink/60">Primary CTA</span>
        <div className="space-y-2">
          <TextInput
            label="Label"
            value={data.primaryCta.label}
            onChange={(v) => update('primaryCta', { ...data.primaryCta, label: v })}
          />
          <TextInput
            label="Href"
            value={data.primaryCta.href}
            onChange={(v) => update('primaryCta', { ...data.primaryCta, href: v })}
          />
        </div>
      </div>

      <div className="rounded-lg border border-ink/10 p-3">
        <span className="mb-2 block text-xs font-medium text-ink/60">Secondary CTA</span>
        <div className="space-y-2">
          <TextInput
            label="Label"
            value={data.secondaryCta.label}
            onChange={(v) => update('secondaryCta', { ...data.secondaryCta, label: v })}
          />
          <TextInput
            label="Href"
            value={data.secondaryCta.href}
            onChange={(v) => update('secondaryCta', { ...data.secondaryCta, href: v })}
          />
        </div>
      </div>

      <TextInput
        label="Email"
        type="email"
        value={data.email}
        onChange={(v) => update('email', v)}
      />

      <StringList
        label="Trusted by"
        items={data.trustedBy}
        onChange={(v) => update('trustedBy', v)}
      />

      <div className="rounded-lg border border-ink/10 p-3">
        <span className="mb-2 block text-xs font-medium text-ink/60">Snapshot card</span>
        <div className="space-y-2">
          <TextInput
            label="Title"
            value={data.snapshot.title}
            onChange={(v) => updateSnapshot('title', v)}
          />
          <TextInput
            label="Description"
            value={data.snapshot.description}
            onChange={(v) => updateSnapshot('description', v)}
          />
          <TextInput
            label="Availability"
            value={data.snapshot.availability}
            onChange={(v) => updateSnapshot('availability', v)}
          />
          <TextArea
            label="Footer"
            value={data.snapshot.footer}
            onChange={(v) => updateSnapshot('footer', v)}
          />
          <ListManager
            label="Stats"
            items={data.snapshot.stats}
            onChange={(v) => updateSnapshot('stats', v)}
            createItem={() => ({ value: '', label: '' })}
            renderItem={(stat, _i, upd) => (
              <div className="space-y-2">
                <TextInput
                  label="Value"
                  value={stat.value}
                  onChange={(v) => upd({ ...stat, value: v })}
                />
                <TextInput
                  label="Label"
                  value={stat.label}
                  onChange={(v) => upd({ ...stat, label: v })}
                />
              </div>
            )}
          />
        </div>
      </div>

      <SaveButton isSaving={isSaving} onClick={handleSave} />
    </div>
  );
}
