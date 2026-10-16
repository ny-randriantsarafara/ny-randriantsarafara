import { Document, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

import type { CvModel } from './cv-model.ts';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Geist',
    fontSize: 10,
    padding: 40,
    lineHeight: 1.4,
  },
  h1: { fontSize: 20, fontWeight: 600, marginBottom: 4 },
  h2: { fontSize: 12, fontWeight: 600, marginTop: 16, marginBottom: 6 },
  muted: { color: '#52525b', marginBottom: 8 },
  paragraph: { marginBottom: 6 },
  itemTitle: { fontWeight: 600 },
});

interface CvDocumentProps {
  model: CvModel;
}

export function CvDocument({ model }: CvDocumentProps) {
  return (
    <Document
      title={`${model.header.name} CV`}
      author={model.header.name}
      language={model.language}
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>{model.header.name}</Text>
        <Text style={styles.muted}>
          {[model.header.headline, model.header.location].filter(Boolean).join(' · ')}
        </Text>
        <Text style={styles.paragraph}>{model.introduction}</Text>
        <Text style={styles.h2}>{model.labels.contact}</Text>
        <Text>{model.header.email}</Text>
        <Link src={model.header.linkedinUrl}>{model.header.linkedinLabel}</Link>
        <Link src={model.header.githubUrl}>{model.header.githubLabel}</Link>
        <Text style={styles.h2}>{model.labels.experience}</Text>
        {model.experiences.map((experience) => (
          <View key={`${experience.company}-${experience.period}`} style={{ marginBottom: 8 }}>
            <Text style={styles.itemTitle}>
              {experience.role} · {experience.company}
            </Text>
            <Text style={styles.muted}>
              {[experience.period, experience.location].filter(Boolean).join(' · ')}
            </Text>
            {experience.highlights.map((highlight) => (
              <Text key={highlight}>• {highlight}</Text>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}
