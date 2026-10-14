export type DailyStatsSnapshot = {
  day: string;
  visitors: number;
  pageViews: number;
  conversations: number;
  modelExchanges: number;
  scriptedExchanges: number;
  outcomeAnswered: number;
  outcomeUnknown: number;
  outcomeSensitive: number;
  outcomeRefused: number;
  contactMessages: number;
  cvDownloads: number;
  impressions: number;
  clicks: number;
  ctr: number;
  averagePosition: number;
  modelCostEur: number;
};
