import { describe, expect, it } from 'vitest';

import {
  apiServicePolicy,
  assistantPolicy,
  grantKeys,
  ownerPolicy,
  publicGrants,
  toPermissionRows,
  workingCollections,
} from './policies.ts';
import type { CollectionGrant } from './policies.ts';

function actionsOn(grants: CollectionGrant[], collection: string): string[] {
  return grants
    .filter((grant) => grant.collection === collection)
    .flatMap((grant) => grant.actions);
}

describe('public policy', () => {
  it('grants nothing', () => {
    expect(publicGrants).toEqual([]);
  });
});

describe('API service policy', () => {
  const definition = apiServicePolicy();

  it('reads publications and manages measurement operational rows', () => {
    expect(grantKeys(definition.grants)).toEqual([
      'alerts:create',
      'alerts:read',
      'chat_exchanges:create',
      'chat_exchanges:delete',
      'chat_exchanges:read',
      'contact_messages:create',
      'contact_messages:delete',
      'daily_stats:create',
      'daily_stats:read',
      'daily_stats:update',
      'directus_files:read',
      'events:create',
      'events:delete',
      'events:read',
      'publications:read',
      'search_console_rows:create',
      'search_console_rows:read',
      'search_console_rows:update',
      'visitor_salts:create',
      'visitor_salts:delete',
      'visitor_salts:read',
    ]);
  });

  it('has no Studio access', () => {
    expect(definition.appAccess).toBe(false);
  });
});

describe('assistant policy', () => {
  const grants = assistantPolicy(false).grants;

  it('creates, reads and updates every working collection', () => {
    const incomplete = workingCollections.filter(
      (collection) => actionsOn(grants, collection).join(',') !== 'create,read,update'
    );

    expect(incomplete).toEqual([]);
  });

  it('never deletes', () => {
    expect(grants.filter((grant) => grant.actions.includes('delete'))).toEqual([]);
  });

  it('only reads publications', () => {
    expect(actionsOn(grants, 'publications')).toEqual(['read']);
  });

  it('reads analytics collections but not contact messages or alerts', () => {
    expect(actionsOn(grants, 'events')).toEqual(['read']);
    expect(actionsOn(grants, 'search_console_rows')).toEqual(['read']);
    expect(actionsOn(grants, 'daily_stats')).toEqual(['read']);
    expect(actionsOn(grants, 'chat_exchanges')).toEqual(['read']);
    expect(actionsOn(grants, 'contact_messages')).toEqual([]);
    expect(actionsOn(grants, 'alerts')).toEqual([]);
  });

  it('cannot reach administration collections', () => {
    const administration = [
      'directus_users',
      'directus_flows',
      'directus_operations',
      'directus_permissions',
      'directus_policies',
      'directus_roles',
      'directus_settings',
    ];

    expect(administration.filter((collection) => actionsOn(grants, collection).length > 0)).toEqual(
      []
    );
  });

  it('follows the requested Studio access flag', () => {
    expect(assistantPolicy(true).appAccess).toBe(true);
    expect(assistantPolicy(false).appAccess).toBe(false);
  });
});

describe('owner policy', () => {
  const grants = ownerPolicy(false).grants;

  it('manages every working collection', () => {
    const incomplete = workingCollections.filter(
      (collection) => actionsOn(grants, collection).join(',') !== 'create,read,update,delete'
    );

    expect(incomplete).toEqual([]);
  });

  it('never deletes a publication', () => {
    expect(actionsOn(grants, 'publications')).toEqual(['create', 'read', 'update']);
  });

  it('reads the flows that render the publication buttons', () => {
    expect(actionsOn(grants, 'directus_flows')).toEqual(['read']);
    expect(actionsOn(grants, 'directus_operations')).toEqual(['read']);
  });

  it('reads analytics, alerts and updates contact message status', () => {
    expect(actionsOn(grants, 'events')).toEqual(['read']);
    expect(actionsOn(grants, 'daily_stats')).toEqual(['read']);
    expect(actionsOn(grants, 'alerts')).toEqual(['read']);
    expect(actionsOn(grants, 'chat_exchanges')).toEqual(['read']);
    expect(actionsOn(grants, 'contact_messages')).toEqual(['read', 'update']);
  });

  it('follows the two-factor flag', () => {
    expect(ownerPolicy(true).enforceTfa).toBe(true);
    expect(ownerPolicy(false).enforceTfa).toBe(false);
  });
});

describe('permission rows', () => {
  it('limits owner account updates to the current user and safe profile fields', () => {
    const row = toPermissionRows('owner-policy', ownerPolicy(true).grants).find(
      (row) => row.collection === 'directus_users' && row.action === 'update'
    );

    expect(row?.permissions).toEqual({ id: { _eq: '$CURRENT_USER' } });
    expect(row?.fields).toContain('tfa_secret');
    expect(row?.fields).not.toContain('*');
    for (const field of ['role', 'status', 'token', 'policies']) {
      expect(row?.fields).not.toContain(field);
    }
  });

  it('keeps item rules and presets empty outside owner self-updates', () => {
    const rows = toPermissionRows('policy-id', [
      ...ownerPolicy(false).grants,
      ...assistantPolicy(false).grants,
      ...apiServicePolicy().grants,
    ]);
    const restricted = rows.filter(
      (row) =>
        !(row.collection === 'directus_users' && row.action === 'update') &&
        (row.permissions !== null || row.validation !== null || row.presets !== null)
    );

    expect(restricted).toEqual([]);
  });
});
