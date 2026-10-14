import {
  activePublicationSchema,
  validatePublicationContent,
  type ActivePublication,
} from '@portfolio/content';

function formatSchemaPaths(issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey> }>): string {
  return issues
    .map((issue) => {
      const segments = issue.path.map(String);
      return segments.length > 0 ? segments.join('.') : '(root)';
    })
    .join(', ');
}

export function parseActivePublication(json: unknown): ActivePublication {
  const parsed = activePublicationSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Invalid publication: ${formatSchemaPaths(parsed.error.issues)}`);
  }
  const validation = validatePublicationContent(parsed.data.content);
  if (!validation.valid) {
    const paths = validation.problems.map((problem) => problem.path);
    throw new Error(`Invalid publication content: ${paths.join(', ')}`);
  }
  return parsed.data;
}
