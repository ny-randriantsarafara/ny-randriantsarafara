import { Card } from '@/components/ui';

import type { ProjectsSectionData } from '@/types';

interface ProjectsProps {
  data: ProjectsSectionData;
}

export function Projects({ data }: ProjectsProps) {
  return (
    <>
      <div className="reveal">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{data.title}</h2>
        <p className="mt-2 max-w-prose text-ink/70">{data.subtitle}</p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-12">
        <div className="hidden md:col-span-1 md:block" aria-hidden="true">
          <div className="mx-auto h-full w-px bg-ink/10" />
        </div>

        <div className="md:col-span-11">
          {data.projects.map((project, index) => {
            const opacity = index === 0 ? '' : index === 1 ? '/80' : '/65';
            return (
              <Card
                key={project.title}
                hover
                className={`reveal group relative ${index > 0 ? 'mt-4' : ''}`}
              >
                <div
                  className="absolute left-0 top-8 hidden -translate-x-[26px] items-center gap-2 md:flex"
                  aria-hidden="true"
                >
                  <span className={`h-3 w-3 rounded-full bg-accent${opacity}`} />
                  <span className="h-px w-6 bg-ink/15" />
                </div>

                <h3 className="text-lg font-semibold">{project.title}</h3>
                <p className="mt-2 text-sm text-ink/70">{project.description}</p>
                <p className="mt-4 text-xs font-medium text-ink/60">
                  Tech:{' '}
                  <span className="font-semibold text-ink/70">{project.tech.join(' · ')}</span>
                </p>
                {project.note && <p className="mt-4 text-xs text-ink/55">{project.note}</p>}
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
