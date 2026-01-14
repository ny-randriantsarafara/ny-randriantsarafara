import { Card } from '@/components/ui';

import type { AboutSectionData } from '@/types';

interface AboutProps {
  data: AboutSectionData;
}

export function About({ data }: AboutProps) {
  return (
    <div className="reveal grid grid-cols-1 gap-10 md:grid-cols-12">
      <div className="md:col-span-7">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{data.title}</h2>
        <div className="mt-4 space-y-4 text-ink/70">
          {data.paragraphs.map((paragraph, index) => {
            const isLast = index === data.paragraphs.length - 1;
            if (isLast) {
              const [first, ...rest] = paragraph.split('. ');
              return (
                <p key={index}>
                  <span className="text-ink">{first}.</span>{' '}
                  <span className="text-ink/70">{rest.join('. ')}</span>
                </p>
              );
            }
            return <p key={index}>{paragraph}</p>;
          })}
        </div>
      </div>

      <aside className="md:col-span-5">
        <Card className="reveal">
          <h3 className="text-sm font-semibold">Quick details</h3>
          <dl className="mt-4 space-y-3 text-sm text-ink/70">
            {data.quickDetails.map((detail) => (
              <div key={detail.label} className="flex items-center justify-between gap-6">
                <dt className="text-ink/55">{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 border-t border-ink/10 pt-5">
            <p className="text-xs text-ink/55">{data.signature.label}</p>
            <p className="mt-1 text-sm font-medium">
              Built between <span className="text-accent">Madagascar</span> and France.
            </p>
          </div>
        </Card>
      </aside>
    </div>
  );
}
