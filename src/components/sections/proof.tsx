import { Card } from '@/components/ui';
import type { ProofSectionData } from '@/types';

interface ProofProps {
  data: ProofSectionData;
}

export function Proof({ data }: ProofProps) {
  return (
    <>
      <div className="reveal flex items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{data.title}</h2>
          <p className="mt-2 max-w-prose text-ink/70">{data.subtitle}</p>
        </div>
        <div className="hidden text-sm text-ink/60 md:block">Scroll · breathe · verify</div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        {data.metrics.map((metric, index) => (
          <Card
            key={metric.value}
            hover
            className={`reveal ${index === 1 ? 'md:translate-y-2' : ''} ${index === 2 ? 'md:translate-y-4' : ''}`}
          >
            <p className="text-4xl font-semibold tracking-tight">{metric.value}</p>
            <p className="mt-2 text-sm text-ink/70">{metric.label}</p>
            <p className="mt-4 text-xs text-ink/55">{metric.detail}</p>
          </Card>
        ))}
      </div>

      <Card className="reveal mt-8">
        <h3 className="text-sm font-semibold">What that looks like in practice</h3>
        <ul className="mt-3 grid gap-2 text-sm text-ink/70 md:grid-cols-2">
          {data.practiceItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>
    </>
  );
}
