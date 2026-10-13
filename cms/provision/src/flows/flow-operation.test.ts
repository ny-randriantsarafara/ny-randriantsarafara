import { describe, expect, it } from 'vitest';

import { operationFieldsDiffer } from './flow-operation.ts';
import type { OperationFields } from './flow-operation.ts';

const declared: OperationFields = {
  type: 'prepare-publication',
  name: 'Prepare publication',
  position_x: 19,
  position_y: 1,
  options: {},
};

describe('operationFieldsDiffer', () => {
  it('reports no drift when the stored fields match the declaration', () => {
    expect(operationFieldsDiffer(declared, declared)).toBe(false);
    expect(operationFieldsDiffer({ ...declared, options: null }, declared)).toBe(false);
  });

  it('detects drift on type, name, position or options', () => {
    expect(operationFieldsDiffer({ ...declared, type: 'log' }, declared)).toBe(true);
    expect(operationFieldsDiffer({ ...declared, name: 'Other' }, declared)).toBe(true);
    expect(operationFieldsDiffer({ ...declared, position_x: 0 }, declared)).toBe(true);
    expect(operationFieldsDiffer({ ...declared, options: { level: 'info' } }, declared)).toBe(true);
  });
});
