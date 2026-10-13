'use client';

import { useEffect, useState } from 'react';

export function useScrollSpy(sectionIds: readonly string[]): string {
  const [activeId, setActiveId] = useState<string>(sectionIds[0] ?? '');

  useEffect(() => {
    if (sectionIds.length === 0) return;

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;

        const top = visible.reduce((best, entry) =>
          entry.intersectionRatio > best.intersectionRatio ? entry : best
        );

        const id = top.target.id;
        if (id) setActiveId(id);
      },
      { threshold: [0.25, 0.5, 0.75], rootMargin: '-20% 0px -40% 0px' }
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [sectionIds]);

  return activeId;
}
