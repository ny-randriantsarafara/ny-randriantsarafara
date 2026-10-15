import type { DirectusRelation, NestedPartial } from '@directus/sdk';
import type { PortfolioSchema } from '@portfolio/cms-schema';

export type RelationDefinition = NestedPartial<DirectusRelation<PortfolioSchema>> & {
  collection: string;
  field: string;
};

type DeleteAction = 'CASCADE' | 'SET NULL' | 'RESTRICT';

function manyToOne(
  collection: string,
  field: string,
  relatedCollection: string,
  onDelete: DeleteAction
): RelationDefinition {
  return {
    collection,
    field,
    related_collection: relatedCollection,
    meta: { one_field: null, sort_field: null, one_deselect_action: 'nullify' },
    schema: { on_delete: onDelete },
  };
}

export const portfolioRelations: RelationDefinition[] = [
  manyToOne('model_settings', 'active_profile', 'model_provider_profiles', 'SET NULL'),
  manyToOne('profile', 'photo', 'directus_files', 'SET NULL'),
  manyToOne('publications', 'user_created', 'directus_users', 'SET NULL'),
];
