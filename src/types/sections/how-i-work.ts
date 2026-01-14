export interface HowIWorkSectionData {
  title: string;
  description: string;
  principles: string[];
  signature: string;
}

export interface HowIWorkSection {
  type: 'how-i-work';
  id: string;
  data: HowIWorkSectionData;
}
