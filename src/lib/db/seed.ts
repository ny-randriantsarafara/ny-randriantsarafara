import { readFileSync } from 'fs';
import { resolve } from 'path';

import { hash } from 'bcryptjs';
import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from './schema';

import type { PageContent } from '@/types';

const SALT_ROUNDS = 12;

interface NavigationData {
  links: Array<{ label: string; href: string }>;
}

interface SiteSettingsData {
  brandName: string;
  roleText: string;
  ctaText: string;
  labels: {
    trustedBy: string;
    quickDetails: string;
    scrollBreathVerify: string;
    practiceHeading: string;
    techLabel: string;
    philosophyLine1: string;
    philosophyLine2: string;
    skipToContent: string;
    locationText: string;
  };
}

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
  }

  const db = drizzle(databaseUrl, { schema });

  const contentPath = resolve(process.cwd(), 'public', 'data', 'content.json');
  const contentFile = readFileSync(contentPath, 'utf-8');
  const content = JSON.parse(contentFile) as PageContent;

  console.warn('Seeding metadata...');
  await db
    .insert(schema.siteContent)
    .values({ key: 'metadata', data: content.metadata })
    .onConflictDoUpdate({ target: schema.siteContent.key, set: { data: content.metadata } });

  console.warn('Seeding sections...');
  for (const section of content.sections) {
    await db
      .insert(schema.siteContent)
      .values({ key: section.type, data: section })
      .onConflictDoUpdate({ target: schema.siteContent.key, set: { data: section } });
  }

  const navigationData: NavigationData = {
    links: [
      { label: 'Proof', href: '#proof' },
      { label: 'Projects', href: '#projects' },
      { label: 'Skills', href: '#skills' },
      { label: 'How I work', href: '#how' },
      { label: 'Contact', href: '#contact' },
    ],
  };

  console.warn('Seeding navigation...');
  await db
    .insert(schema.siteContent)
    .values({ key: 'navigation', data: navigationData })
    .onConflictDoUpdate({ target: schema.siteContent.key, set: { data: navigationData } });

  const siteSettingsData: SiteSettingsData = {
    brandName: 'Ny Hasinavalona',
    roleText: 'Senior Software Engineer',
    ctaText: "Let's talk",
    labels: {
      trustedBy: 'Trusted by teams at',
      quickDetails: 'Quick details',
      scrollBreathVerify: 'Scroll · breathe · verify',
      practiceHeading: 'What that looks like in practice',
      techLabel: 'Tech:',
      philosophyLine1: 'Good software is quiet.',
      philosophyLine2: "It doesn't wake you up at night.",
      skipToContent: 'Skip to content',
      locationText: 'Built between Madagascar and France.',
    },
  };

  console.warn('Seeding site settings...');
  await db
    .insert(schema.siteContent)
    .values({ key: 'site-settings', data: siteSettingsData })
    .onConflictDoUpdate({ target: schema.siteContent.key, set: { data: siteSettingsData } });

  console.warn('Creating admin user...');
  const passwordHash = await hash(adminPassword, SALT_ROUNDS);
  await db
    .insert(schema.users)
    .values({ email: adminEmail, passwordHash, name: 'Admin', role: 'admin' })
    .onConflictDoUpdate({ target: schema.users.email, set: { passwordHash, name: 'Admin' } });

  console.warn('Seed complete.');
  process.exit(0);
}

seed().catch((seedError: unknown) => {
  console.error('Seed failed:', seedError);
  process.exit(1);
});
