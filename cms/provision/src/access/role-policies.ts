export function rolePolicyIdsMatchExpected(
  policyIds: readonly string[],
  expectedPolicyId: string
): boolean {
  if (policyIds.length !== 1) {
    return false;
  }
  return policyIds.at(0) === expectedPolicyId;
}
