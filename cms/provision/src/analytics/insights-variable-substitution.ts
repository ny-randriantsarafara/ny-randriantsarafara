/**
 * Mirrors Directus 12.5.0 `applyOptionsData` / `renderMustache` from `@directus/utils` inside the
 * pinned `directus/directus:12.5.0` image (`@directus/utils` 14.0.0, `dist/shared/index.js`,
 * region `shared/apply-options-data.ts`). Used to test provisioned panel filters.
 */

type Scope = Record<string, unknown>;

function readScopeValue(scope: Scope, path: string): unknown {
  if (!Object.prototype.hasOwnProperty.call(scope, path)) {
    return undefined;
  }
  return scope[path];
}

function resolvePath(path: string, scope: Scope, skipUndefined: boolean): string {
  const value = readScopeValue(scope, path);
  if (value !== undefined || !skipUndefined) {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value);
  }
  return `{{ ${path} }}`;
}

function renderTemplateString(item: string, scope: Scope, skipUndefined: boolean): unknown {
  const exact = item.match(/^\{\{\s*([^}\s]+)\s*\}\}$/);
  if (exact !== null) {
    const path = exact[1];
    if (path !== undefined) {
      const value = readScopeValue(scope, path);
      if (value !== undefined) {
        return value;
      }
    }
  }

  return item.replace(/\{\{\s*([^}\s]+)\s*\}\}/g, (_match, path: string) =>
    resolvePath(path, scope, skipUndefined)
  );
}

function renderMustacheValue(item: unknown, scope: Scope, skipUndefined: boolean): unknown {
  if (typeof item === 'string') {
    return renderTemplateString(item, scope, skipUndefined);
  }
  if (Array.isArray(item)) {
    return item.map((element) => renderMustacheValue(element, scope, skipUndefined));
  }
  if (item !== null && typeof item === 'object') {
    return Object.fromEntries(
      Object.entries(item).map(([key, value]) => [
        key,
        renderMustacheValue(value, scope, skipUndefined),
      ])
    );
  }
  return item;
}

/** Same contract as Directus `applyOptionsData` for panel option objects. */
export function substituteInsightsPanelOptions(
  options: Record<string, unknown>,
  scope: Scope,
  skipUndefinedKeys: string[] = []
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(options).map(([key, value]) => [
      key,
      renderMustacheValue(value, scope, skipUndefinedKeys.includes(key)),
    ])
  );
}

/** Collects string operands used with `_eq` anywhere in a filter tree. */
export function collectEqOperands(filter: unknown): string[] {
  const operands: string[] = [];
  walkFilter(filter, operands);
  return operands;
}

function walkFilter(node: unknown, operands: string[]): void {
  if (node === null || typeof node !== 'object') {
    return;
  }
  if (Array.isArray(node)) {
    for (const entry of node) {
      walkFilter(entry, operands);
    }
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === '_eq' && typeof value === 'string') {
      operands.push(value);
    } else {
      walkFilter(value, operands);
    }
  }
}
