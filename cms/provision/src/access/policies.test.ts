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

  it('only reads publications', () => {
    expect(grantKeys(definition.grants)).toEqual(['publications:read']);
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

  it('follows the two-factor flag', () => {
    expect(ownerPolicy(true).enforceTfa).toBe(true);
    expect(ownerPolicy(false).enforceTfa).toBe(false);
  });
});

describe('permission rows', () => {
  it('only produces rows allowed by Directus Core', () => {
    const rows = toPermissionRows('policy-id', [
      ...ownerPolicy(false).grants,
      ...assistantPolicy(false).grants,
    ]);
    const restricted = rows.filter(
      (row) =>
        row.fields.join(',') !== '*' ||
        row.permissions !== null ||
        row.validation !== null ||
        row.presets !== null
    );

    expect(restricted).toEqual([]);
  });
});
