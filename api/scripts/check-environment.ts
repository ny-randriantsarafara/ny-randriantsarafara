import { readFileSync } from 'node:fs';

import { readApiEnvironment } from '../src/environment.ts';

// Run by deploy/render.sh on the rendered environment of the api service, so a delivery that the API
// would refuse at startup fails before reaching a server. Prints no value: the file holds secrets.

function isStringRecord(value: unknown): value is Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every((entry) => typeof entry === 'string');
}

function readEnvironmentFile(path: string): Record<string, string> {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!isStringRecord(parsed)) {
    throw new Error('The rendered API environment must map names to strings.');
  }
  return parsed;
}

function describeSwitch(enabled: boolean): string {
  if (enabled) {
    return 'on';
  }
  return 'off';
}

function main(): void {
  const path = process.argv[2];
  if (path === undefined) {
    console.error('Usage: node api/scripts/check-environment.ts <environment.json>');
    process.exit(2);
  }
  try {
    const environment = readApiEnvironment(readEnvironmentFile(path));
    console.log(
      `API environment accepted: model provider ${describeSwitch(environment.modelProvider !== null)}, ` +
        `contact email ${describeSwitch(environment.smtp !== null)}.`
    );
  } catch (error) {
    console.error(
      `The API would refuse to start: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

main();
