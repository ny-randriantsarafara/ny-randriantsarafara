import type { HowIWorkSectionData } from '@/types';

interface HowIWorkProps {
  data: HowIWorkSectionData;
}

export function HowIWork({ data }: HowIWorkProps) {
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
        <span className="font-medium text-accent">Good software is quiet.</span> It doesn&apos;t wake
        you up at night.
      </p>
    </div>
  );
}
