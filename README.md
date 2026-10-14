# Ny Hasinavalona Randriantsarafara — portfolio

Source of [nyhasinavalona.com](https://nyhasinavalona.com), on its way to becoming a conversational portfolio: a chat that answers recruiters from published content and drives the page.

| Path                | Content                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `site/`             | Next.js site in English and French, built from the active publication and exported statically |
| `api/`              | Content API serving the active publication                                                    |
| `packages/content/` | Publication content schema, validation and change summaries                                   |
| `cms/`              | Directus configuration as code, publication extension, integration tests                      |
| `deploy/`           | Images, VPS instances (staging and production), delivery checks                               |
| `docs/`             | Architecture, standards, development guide, delivery, design spec and plans                   |

Start with [docs/development.md](docs/development.md); delivery is in [docs/delivery.md](docs/delivery.md). The design is in [docs/superpowers/specs/2026-10-13-conversational-portfolio-design.md](docs/superpowers/specs/2026-10-13-conversational-portfolio-design.md).
