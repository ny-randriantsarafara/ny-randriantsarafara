// Matches common crawlers, headless browsers, Lighthouse and preview bots.
const BOT_USER_AGENT =
  /bot|crawler|spider|headless|lighthouse|preview|slurp|bingpreview|facebookexternalhit/i;

export function isBotUserAgent(userAgent: string): boolean {
  if (userAgent.trim().length === 0) {
    return false;
  }
  return BOT_USER_AGENT.test(userAgent);
}
