import { describe, expect, it } from 'vitest';

import { rolePolicyIdsMatchExpected } from './role-policies.ts';

describe('rolePolicyIdsMatchExpected', () => {
  it('accepts exactly the expected policy', () => {
    expect(rolePolicyIdsMatchExpected(['policy-1'], 'policy-1')).toBe(true);
  });

  it.each([
    ['no policy', []],
    ['another policy', ['policy-2']],
    ['an extra policy', ['policy-1', 'policy-2']],
  ])('rejects %s', (_case, policyIds) => {
    expect(rolePolicyIdsMatchExpected(policyIds, 'policy-1')).toBe(false);
  });
});
