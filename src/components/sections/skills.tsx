import { Card } from '@/components/ui';

import type { SkillsSectionData } from '@/types';

interface SkillsProps {
  data: SkillsSectionData;
}

export function Skills({ data }: SkillsProps) {
  return (
    <>
      <div className="reveal">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{data.title}</h2>
        <p className="mt-2 max-w-prose text-ink/70">{data.subtitle}</p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        {data.skills.map((skill) => (
          <Card key={skill.title} className="reveal">
            <h3 className="text-sm font-semibold">{skill.title}</h3>
            <p className="mt-2 text-sm text-ink/70">{skill.description}</p>
            <p className="mt-4 text-xs text-ink/60">{skill.details}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
