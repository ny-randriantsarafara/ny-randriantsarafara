import type { HowIWorkSectionData, SiteLabels } from '@/types';

interface HowIWorkProps {
  data: HowIWorkSectionData;
  labels: Pick<SiteLabels, 'philosophyLine1' | 'philosophyLine2'>;
}

export function HowIWork({ data, labels }: HowIWorkProps) {
  return (
    <div className="reveal max-w-2xl">
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{data.title}</h2>
      <p className="mt-3 text-ink/70">{data.description}</p>

      <ul className="mt-8 grid gap-3 text-sm text-ink/70 md:grid-cols-2">
        {data.principles.map((principle) => (
          <li key={principle} className="rounded-2xl border border-ink/10 bg-paper px-4 py-3">
            {principle}
          </li>
        ))}
      </ul>

      <p className="reveal mt-10 text-sm text-ink/70">
        <span className="font-medium text-accent">{labels.philosophyLine1}</span>{' '}
        {labels.philosophyLine2}
      </p>
    </div>
  );
}
