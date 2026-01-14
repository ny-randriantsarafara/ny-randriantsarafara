export interface QuickDetail {
  label: string;
  value: string;
}

export interface AboutSectionData {
  title: string;
  paragraphs: string[];
  quickDetails: QuickDetail[];
  signature: {
    label: string;
    text: string;
  };
}

export interface AboutSection {
  type: 'about';
  id: string;
  data: AboutSectionData;
}
