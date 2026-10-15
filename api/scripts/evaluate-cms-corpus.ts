import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import {
  corpusMutations,
  developmentSeeds,
  heldOutSeeds,
  makeCmsCorpus,
} from '../src/chat/testing/cms-corpus.ts';
import { verifyFreeRoute } from './evaluation-safety.ts';

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...value] = arg.replace(/^--/, '').split('=');
    return [key ?? '', value.join('=')];
  })
);
const engineDir = args.get('engine-dir');
const variant = args.get('variant');
const output = args.get('output');
const offline = args.has('offline');
const model = args.get('model') ?? 'offline:free';
const maxCalls = Number(args.get('max-calls') ?? '60');
if (!engineDir || !output || !['baseline', 'optimized'].includes(variant ?? ''))
  throw new Error('Require --engine-dir= --variant=baseline|optimized --output=');
if (!Number.isInteger(maxCalls) || maxCalls < 1 || maxCalls > 60)
  throw new Error('max-calls must be 1..60');
const seeds =
  args.get('seeds')?.split(',').map(Number) ??
  (args.has('held-out') ? heldOutSeeds : developmentSeeds);
const pairedEngine = args.get('compare-engine-dir');
const engines = [
  { engineDir, variant },
  ...(pairedEngine
    ? [{ engineDir: pairedEngine, variant: variant === 'baseline' ? 'optimized' : 'baseline' }]
    : []),
];
const scenarios = seeds.flatMap((seed) =>
  corpusMutations.map((mutation) => ({ seed, mutation, corpus: makeCmsCorpus(seed, mutation) }))
);
for (const scenario of scenarios) {
  if (args.get('locale') === 'fr') {
    scenario.corpus.request.locale = 'fr';
    const last = scenario.corpus.request.messages.at(-1);
    if (last)
      last.text =
        scenario.mutation === 'new-skill'
          ? `Décrivez le projet rust-${scenario.seed}.`
          : `Quelle couverture avez-vous atteinte chez company-${scenario.seed}-a ?`;
  }
  if (args.has('large')) {
    // Preserve facts and relationships; stress UTF-8 bytes with published prose.
    scenario.corpus.active.content.profile.introduction.en +=
      ' Published systems engineering experience.'.repeat(3000);
    scenario.corpus.active.content.profile.introduction.fr +=
      ' Expérience publiée en ingénierie système.'.repeat(3000);
  }
}
if (scenarios.length * engines.length > maxCalls)
  throw new Error('Corpus exceeds the hard attempt budget');
if (!offline) await verifyFreeRoute(model, maxCalls);
const sha = spawnSync('git', ['-C', engineDir, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
appendFileSync(
  output,
  JSON.stringify({
    type: 'run',
    variant,
    engineDir: resolve(engineDir),
    engineSha:
      sha.status === 0 ? sha.stdout.trim() : (args.get('engine-sha') ?? 'unverified-snapshot'),
    offline,
    model,
    maxCalls,
    responseCacheEnabled: false,
    manualRubric: [
      'Associate each number with its company, including paraphrases',
      'Reject deleted/obsolete facts and stale assistant history',
      'Inspect card relevance and source support; public replies do not expose evidence',
      'Check language and contradiction uncertainty',
      'Review ambiguity and large-publication context limits separately',
    ],
    limitations: [
      'No automatic semantic entailment score',
      'Offline timeout transport measures regressions, not model quality',
      'Provider cost unknown unless recorded; CMS zero price is not proof of provider billing',
    ],
  }) + '\n'
);
let lastStarted = -Infinity;
let attempt = 0;
for (const [index, scenario] of scenarios.entries()) {
  for (const engine of index % 2 === 0 ? engines : [...engines].reverse()) {
    attempt += 1;
    const wait = offline ? 0 : Math.max(0, 3200 - (performance.now() - lastStarted));
    if (wait > 0) await new Promise((done) => setTimeout(done, wait));
    const child = spawnSync(
      process.execPath,
      [fileURLToPath(new URL('./corpus-engine.ts', import.meta.url))],
      {
        input: JSON.stringify({
          ...scenario.corpus,
          engineDir: resolve(engine.engineDir),
          model,
          offline,
          output: resolve(output),
          attempt,
          variant: engine.variant,
          quotaWaitMs: wait,
        }),
        encoding: 'utf8',
        timeout: 20000,
      }
    );
    if (child.status !== 0)
      throw new Error(
        `Engine child failed at attempt ${index + 1}: ${child.stderr.slice(0, 1000)}`
      );
    // Waiting from child completion is conservative: actual provider starts
    // cannot get closer than 3.2 s due to variable import/startup latency.
    lastStarted = performance.now();
    const result: unknown = JSON.parse(child.stdout);
    appendFileSync(
      output,
      JSON.stringify({
        type: 'result',
        variant: engine.variant,
        engineDir: resolve(engine.engineDir),
        seed: scenario.seed,
        mutation: scenario.mutation,
        expectedFacts: scenario.corpus.expectedFacts,
        forbiddenFacts: scenario.corpus.forbiddenFacts,
        expectedEvidenceSlugs: scenario.corpus.expectedEvidenceSlugs,
        result,
        review: 'pending-human-review',
      }) + '\n'
    );
  }
}
