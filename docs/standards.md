# Code Standards & Tooling

This document describes the linting, formatting, and code quality standards for this project.

## Quick Reference

| Command                | Description                                |
| ---------------------- | ------------------------------------------ |
| `npm run lint`         | Run ESLint (fails on warnings)             |
| `npm run lint:fix`     | Auto-fix ESLint issues                     |
| `npm run format`       | Format all files with Prettier             |
| `npm run format:check` | Check formatting without changes           |
| `npm run typecheck`    | Run TypeScript type checking               |
| `npm run validate`     | Run all checks (typecheck + lint + format) |
| `npm run build`        | Build the project                          |

---

## Formatting (Prettier)

Configuration: [.prettierrc](../.prettierrc)

### Settings

- **Indentation**: 2 spaces (no tabs)
- **Quotes**: Single quotes (`'`) for JS/TS
- **JSX Quotes**: Double quotes (`"`) for JSX attributes
- **Semicolons**: Always
- **Trailing Commas**: ES5-compatible (arrays, objects)
- **Print Width**: 100 characters
- **Line Endings**: LF (Unix-style)
- **Arrow Parens**: Always (`(x) => x`)
- **Bracket Spacing**: Yes (`{ foo: bar }`)

### Example

```typescript
// Good
const greeting = 'Hello, world!';
const users = ['Alice', 'Bob', 'Charlie'];
const config = { theme: 'dark', lang: 'en' };

// Bad
const greeting = 'Hello, world!';
const users = ['Alice', 'Bob', 'Charlie'];
const config = { theme: 'dark', lang: 'en' };
```

---

## Linting (ESLint)

Configuration: [eslint.config.mjs](../eslint.config.mjs)

### Extends

- `eslint-config-next/core-web-vitals` - Next.js recommended rules
- `eslint-config-next/typescript` - TypeScript support
- `eslint-config-prettier` - Disables conflicting rules

### Key Rules

#### TypeScript

- **No unused variables**: Error (prefix with `_` to ignore)
- **No explicit `any`**: Warning
- **Consistent type imports**: Use `type` keyword for type-only imports

```typescript
// Good
import { type User } from '@/types/user';
import { formatDate } from '@/lib/utils';

// Bad
import { User } from '@/types/user';
```

#### General

- **No `console.log`**: Warning (`console.warn` and `console.error` allowed)
- **Prefer `const`**: Error
- **No `var`**: Error
- **Strict equality**: Always use `===` and `!==`

#### Imports

- **Ordered imports**: Enforced with groups
  1. Built-in (node modules)
  2. External (npm packages)
  3. Internal (aliased paths)
  4. Parent (`../`)
  5. Sibling (`./`)
  6. Index
  7. Types

```typescript
// Good
import path from 'path';

import Image from 'next/image';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import { helper } from '../utils';
import { localFn } from './local';

import { type User } from '@/types';
```

#### React

- **Self-closing components**: Required when no children
- **No unnecessary curly braces**: In props and children

```tsx
// Good
<Image src="/logo.png" alt="Logo" />
<Button variant="primary">Click me</Button>

// Bad
<Image src="/logo.png" alt="Logo"></Image>
<Button variant={'primary'}>{'Click me'}</Button>
```

---

## Editor Configuration

Configuration: [.editorconfig](../.editorconfig)

Ensures consistent settings across different editors:

- **Indent**: 2 spaces
- **Charset**: UTF-8
- **Line endings**: LF
- **Trailing whitespace**: Trimmed
- **Final newline**: Inserted

Install the EditorConfig extension for your editor:

- VS Code: [EditorConfig for VS Code](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig)
- JetBrains IDEs: Built-in support

---

## VS Code Setup (Recommended)

Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```

### Recommended Extensions

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [EditorConfig](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

---

## CI/CD Integration

Run validation in CI pipelines:

```yaml
# GitHub Actions example
- name: Validate code
  run: npm run validate

- name: Build
  run: npm run build
```

---

## File Structure

```
.
├── .editorconfig        # Editor settings
├── .prettierrc          # Prettier config
├── .prettierignore      # Files to skip formatting
├── eslint.config.mjs    # ESLint flat config
├── tsconfig.json        # TypeScript config
└── package.json         # Scripts
```

---

## Troubleshooting

### ESLint not finding config

Ensure you're using ESLint v9+ with flat config:

```bash
npm ls eslint
```

### Prettier conflicts with ESLint

`eslint-config-prettier` disables conflicting rules. If issues persist:

```bash
npm run lint:fix && npm run format
```

### Type errors

Run typecheck separately to see all errors:

```bash
npm run typecheck
```
