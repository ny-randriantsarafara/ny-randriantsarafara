import { Badge, Button, Card } from '@/components/ui';

import type { HeroSectionData } from '@/types';

interface HeroProps {
  data: HeroSectionData;
}

export function Hero({ data }: HeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="lava" aria-hidden="true" />

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-16 md:grid-cols-12 md:py-24">
        <div className="md:col-span-7">
          <Badge className="reveal">
            <span className="inline-block h-2 w-2 rounded-full bg-accent" />
            {data.tagline}
          </Badge>

          <h1 className="reveal mt-5 text-4xl font-semibold tracking-tight md:text-6xl">
            {data.headline}
            <span className="relative text-ink">
              {data.highlightedText}
              <span className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-accent/60" />
            </span>
            , not to impress.
          </h1>

          <p className="reveal mt-5 max-w-prose text-base leading-relaxed text-ink/70 md:text-lg">
            {data.subheadline}
          </p>

          <div className="reveal mt-8 flex flex-wrap items-center gap-3">
            <Button href={data.primaryCta.href}>{data.primaryCta.label}</Button>
            <Button variant="secondary" href={data.secondaryCta.href}>
              {data.secondaryCta.label}
            </Button>
            <a href={`mailto:${data.email}`} className="text-sm text-ink/70 hover:text-ink">
              {data.email}
            </a>
          </div>

          <div className="reveal mt-10">
            <p className="text-xs font-medium tracking-wide text-ink/50">Trusted by teams at</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-ink/55">
              {data.trustedBy.map((company) => (
                <span key={company} className="hover:text-ink">
                  {company}
                </span>
              ))}
            </div>
          </div>
        </div>

        <aside className="md:col-span-5">
          <Card className="reveal relative h-full">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium tracking-wide text-ink/50">
                  {data.snapshot.title}
                </p>
                <p className="mt-2 text-sm text-ink/70">{data.snapshot.description}</p>
              </div>
              <Badge variant="accent">{data.snapshot.availability}</Badge>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-4">
              {data.snapshot.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-ink/10 bg-paper px-4 py-3"
                >
                  <dt className="text-xs text-ink/50">{stat.label}</dt>
                  <dd className="mt-1 text-xl font-semibold">{stat.value}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-6 text-xs leading-relaxed text-ink/55">{data.snapshot.footer}</p>
          </Card>
        </aside>
      </div>
    </section>
  );
}
