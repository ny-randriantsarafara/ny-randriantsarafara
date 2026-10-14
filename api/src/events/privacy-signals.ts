export type PrivacySignals = {
  doNotTrack: boolean;
  globalPrivacyControl: boolean;
};

export function readPrivacySignals(headers: Headers): PrivacySignals {
  const dnt = headers.get('DNT');
  const gpc = headers.get('Sec-GPC');
  return {
    doNotTrack: dnt === '1',
    globalPrivacyControl: gpc === '1',
  };
}

export function shouldDiscardForPrivacy(signals: PrivacySignals): boolean {
  return signals.doNotTrack || signals.globalPrivacyControl;
}
