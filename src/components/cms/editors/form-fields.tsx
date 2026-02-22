'use client';

import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  children: ReactNode;
}

export function Field({ label, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink/60">{label}</span>
      {children}
    </label>
  );
}

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'url';
}

export function TextInput({ label, value, onChange, type = 'text' }: TextInputProps) {
  return (
    <Field label={label}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
      />
    </Field>
  );
}

interface TextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}

export function TextArea({ label, value, onChange, rows = 3 }: TextAreaProps) {
  return (
    <Field label={label}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
      />
    </Field>
  );
}

interface SaveButtonProps {
  isSaving: boolean;
  onClick: () => void;
}

export function SaveButton({ isSaving, onClick }: SaveButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isSaving}
      className="mt-6 w-full rounded-xl bg-ink px-4 py-3 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {isSaving ? 'Saving...' : 'Save changes'}
    </button>
  );
}

interface ListManagerProps<T> {
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, index: number, update: (updated: T) => void) => ReactNode;
  createItem: () => T;
  label: string;
}

export function ListManager<T>({
  items,
  onChange,
  renderItem,
  createItem,
  label,
}: ListManagerProps<T>) {
  const handleAdd = () => onChange([...items, createItem()]);

  const handleRemove = (index: number) => onChange(items.filter((_, i) => i !== index));

  const handleUpdate = (index: number, updated: T) =>
    onChange(items.map((item, i) => (i === index ? updated : item)));

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const next = [...items];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const next = [...items];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-ink/60">{label}</span>
        <button
          onClick={handleAdd}
          className="rounded-lg border border-ink/15 px-2 py-1 text-xs text-ink/70 hover:bg-ink/5"
        >
          + Add
        </button>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="rounded-lg border border-ink/10 p-3">
            {renderItem(item, index, (updated) => handleUpdate(index, updated))}
            <div className="mt-2 flex gap-1">
              <button
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                className="rounded px-2 py-1 text-xs text-ink/50 hover:bg-ink/5 disabled:opacity-30"
              >
                &uarr;
              </button>
              <button
                onClick={() => handleMoveDown(index)}
                disabled={index === items.length - 1}
                className="rounded px-2 py-1 text-xs text-ink/50 hover:bg-ink/5 disabled:opacity-30"
              >
                &darr;
              </button>
              <button
                onClick={() => handleRemove(index)}
                className="ml-auto rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface StringListProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}

export function StringList({ label, items, onChange }: StringListProps) {
  return (
    <ListManager
      label={label}
      items={items}
      onChange={onChange}
      createItem={() => ''}
      renderItem={(item, _index, update) => (
        <input
          type="text"
          value={item}
          onChange={(e) => update(e.target.value)}
          className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
        />
      )}
    />
  );
}
