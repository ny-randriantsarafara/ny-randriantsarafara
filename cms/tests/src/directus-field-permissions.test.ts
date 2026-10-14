import { createPermissions, readPolicies } from '@directus/sdk';
import { API_SERVICE_POLICY_NAME } from '@portfolio/cms-provision/access';
import { describe, expect, it } from 'vitest';

import { adminClient } from './support/clients.ts';
import { captureErrorCode } from './support/errors.ts';

describe('Directus field-scoped permissions', () => {
  it('rejects field lists on Directus Core with RESOURCE_RESTRICTED', async () => {
    const [policy] = await adminClient.request(
      readPolicies({
        filter: { name: { _eq: API_SERVICE_POLICY_NAME } },
        fields: ['id'],
        limit: 1,
      })
    );
    if (policy === undefined) {
      throw new Error('API service policy missing: run pnpm provision.');
    }

    const attempt = adminClient.request(
      createPermissions([
        {
          policy: policy.id,
          collection: 'contact_messages',
          action: 'read',
          fields: ['id', 'date_created', 'date_updated', 'status'],
          permissions: null,
          validation: null,
          presets: null,
        },
      ])
    );

    const code = await captureErrorCode(attempt);
    expect(code).toBe('RESOURCE_RESTRICTED');
  });
});
