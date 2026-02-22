'use client';

import { useCallback, useState } from 'react';

import { useAdmin } from './admin-provider';
import { SectionEditorPanel } from './section-editor-panel';

import type { ContentKey } from '@/types';
import type { ReactNode } from 'react';

interface EditableSectionProps {
  sectionKey: ContentKey;
  currentData: unknown;
  children: ReactNode;
}

export function EditableSection({ sectionKey, currentData, children }: EditableSectionProps) {
  const { isAdmin } = useAdmin();
  const [isEditing, setIsEditing] = useState(false);

  const handleOpen = useCallback(() => setIsEditing(true), []);
  const handleClose = useCallback(() => setIsEditing(false), []);

  if (!isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="group/editable relative">
      {children}

      <button
        onClick={handleOpen}
        className="absolute right-4 top-4 z-30 rounded-xl border border-ink/10 bg-paper px-3 py-2 text-xs font-medium text-ink/70 opacity-0 shadow-sm transition-opacity hover:bg-ink hover:text-paper group-hover/editable:opacity-100"
        aria-label={`Edit ${sectionKey}`}
      >
        Edit
      </button>

      {isEditing && (
        <SectionEditorPanel
          sectionKey={sectionKey}
          initialData={currentData}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
