export interface Metric {
  value: string;
  label: string;
  detail: string;
}

export interface ProofSectionData {
  title: string;
  subtitle: string;
  metrics: Metric[];
  practiceItems: string[];
}

export interface ProofSection {
  type: 'proof';
  id: string;
  data: ProofSectionData;
}
