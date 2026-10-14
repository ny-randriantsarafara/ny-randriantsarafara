import type { PortfolioSchema } from '@portfolio/cms-schema';

export type PermissionAction = 'create' | 'read' | 'update' | 'delete';

export type SystemCollection =
  | 'directus_files'
  | 'directus_folders'
  | 'directus_users'
  | 'directus_flows'
  | 'directus_operations';

export type GrantedCollection = keyof PortfolioSchema | SystemCollection;

export type CollectionGrant = {
  collection: GrantedCollection;
  actions: PermissionAction[];
  fields?: string[];
};

export type PolicyDefinition = {
  name: string;
  icon: string;
  description: string;
  appAccess: boolean;
  enforceTfa: boolean;
  grants: CollectionGrant[];
};

export type PermissionRow = {
  policy: string;
  collection: GrantedCollection;
  action: PermissionAction;
  fields: string[];
  permissions: null;
  validation: null;
  presets: null;
};

export const PUBLIC_POLICY_ID = 'abf8a154-5b1c-4a46-ac9c-7300570f4f17';
export const OWNER_POLICY_NAME = 'Owner';
export const ASSISTANT_POLICY_NAME = 'Assistant';
export const API_SERVICE_POLICY_NAME = 'API service';

export const workingCollections: (keyof PortfolioSchema)[] = [
  'profile',
  'capabilities',
  'skills',
  'experiences',
  'projects',
  'key_figures',
  'answers',
  'chat_settings',
  'site_settings',
];

const allActions: PermissionAction[] = ['create', 'read', 'update', 'delete'];

function grant(
  collections: GrantedCollection[],
  actions: PermissionAction[],
  fields?: string[]
): CollectionGrant[] {
  return collections.map((collection) => ({ collection, actions, fields }));
}

const analyticsCollections: (keyof PortfolioSchema)[] = [
  'events',
  'chat_exchanges',
  'search_console_rows',
  'daily_stats',
];

const contactRetentionFields = ['id', 'date_created', 'status'];

export const publicGrants: CollectionGrant[] = [];

export function ownerPolicy(enforceTfa: boolean): PolicyDefinition {
  return {
    name: OWNER_POLICY_NAME,
    icon: 'verified_user',
    description: 'Edits the content, prepares, publishes and rolls back publications.',
    appAccess: true,
    enforceTfa,
    grants: [
      ...grant(workingCollections, allActions),
      ...grant(['publications'], ['create', 'read', 'update']),
      ...grant(analyticsCollections, ['read']),
      ...grant(['alerts'], ['read']),
      ...grant(['contact_messages'], ['read', 'update']),
      ...grant(['directus_files', 'directus_folders'], allActions),
      ...grant(['directus_users', 'directus_flows', 'directus_operations'], ['read']),
    ],
  };
}

export function apiServicePolicy(): PolicyDefinition {
  return {
    name: API_SERVICE_POLICY_NAME,
    icon: 'api',
    description: 'Reads the active publication and writes operational chat and contact data.',
    appAccess: false,
    enforceTfa: false,
    grants: [
      ...grant(['publications'], ['read']),
      ...grant(['events'], ['create', 'read', 'delete']),
      ...grant(['visitor_salts'], ['create', 'read', 'delete']),
      ...grant(['search_console_rows'], ['create', 'read', 'update']),
      ...grant(['daily_stats'], ['create', 'read', 'update']),
      ...grant(['alerts'], ['create', 'read']),
      ...grant(['chat_exchanges'], ['create', 'read', 'delete']),
      ...grant(['contact_messages'], ['create']),
      ...grant(['contact_messages'], ['read'], contactRetentionFields),
      ...grant(['contact_messages'], ['delete']),
      ...grant(['directus_files'], ['read']),
    ],
  };
}

export function assistantPolicy(appAccess: boolean): PolicyDefinition {
  return {
    name: ASSISTANT_POLICY_NAME,
    icon: 'smart_toy',
    description: 'Edits the working content through MCP. Never publishes or deletes.',
    appAccess,
    enforceTfa: false,
    grants: [
      ...grant(workingCollections, ['create', 'read', 'update']),
      ...grant(['publications'], ['read']),
      ...grant(analyticsCollections, ['read']),
      ...grant(['directus_files', 'directus_folders'], ['read']),
    ],
  };
}

export function toPermissionRows(policyId: string, grants: CollectionGrant[]): PermissionRow[] {
  return grants.flatMap((collectionGrant) =>
    collectionGrant.actions.map((action) => ({
      policy: policyId,
      collection: collectionGrant.collection,
      action,
      fields: collectionGrant.fields ?? ['*'],
      permissions: null,
      validation: null,
      presets: null,
    }))
  );
}

export function grantKeys(grants: CollectionGrant[]): string[] {
  return grants
    .flatMap((collectionGrant) =>
      collectionGrant.actions.map((action) => `${collectionGrant.collection}:${action}`)
    )
    .toSorted();
}
