export function tokensOverlap(
  questionTokens: readonly string[],
  sourceTokens: readonly string[]
): number {
  if (questionTokens.length === 0 || sourceTokens.length === 0) {
    return 0;
  }

  return questionTokens.reduce((score, questionToken) => {
    const matched = sourceTokens.some((sourceToken) => tokensMatch(questionToken, sourceToken));
    return score + (matched ? 1 : 0);
  }, 0);
}

function tokensMatch(left: string, right: string): boolean {
  if (left === right) {
    return true;
  }
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length <= right.length ? right : left;
  if (shorter.length < 4) {
    return false;
  }
  return longer.startsWith(shorter);
}
