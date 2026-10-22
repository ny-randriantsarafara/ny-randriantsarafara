# syntax=docker/dockerfile:1.7

# Every stage installs only the workspace packages its target runs; Node runs the TypeScript sources.
FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS sources
RUN corepack enable
WORKDIR /workspace
COPY . .

FROM sources AS extension-build
RUN pnpm install --frozen-lockfile --filter directus-extension-publication... --filter directus-extension-analytics... \
  && pnpm --filter directus-extension-publication build \
  && pnpm --filter directus-extension-analytics build

FROM directus/directus:12.5.0@sha256:7de5d6898b955dab1672619aed590035dcade4f8d7396d913e55543e114d1331 AS directus
COPY --from=extension-build --chown=node:node /workspace/cms/extensions/publication/package.json /directus/extensions/publication/package.json
COPY --from=extension-build --chown=node:node /workspace/cms/extensions/publication/dist /directus/extensions/publication/dist
COPY --from=extension-build --chown=node:node /workspace/cms/extensions/analytics/package.json /directus/extensions/analytics/package.json
COPY --from=extension-build --chown=node:node /workspace/cms/extensions/analytics/dist /directus/extensions/analytics/dist

FROM sources AS api
RUN pnpm install --frozen-lockfile --prod --ignore-scripts --filter @portfolio/api...
ENV NODE_ENV=production
WORKDIR /workspace/api
USER node
EXPOSE 8066 8067
CMD ["node", "src/main.ts"]

FROM sources AS provision
RUN pnpm install --frozen-lockfile --prod --ignore-scripts --filter @portfolio/cms-provision...
ENV NODE_ENV=production
WORKDIR /workspace/cms/provision
USER node
CMD ["node", "src/main.ts"]

# Staging only: production serves the same export from GitHub Pages. The workflow builds the export
# from the staging publication and passes it as the named context site-export.
FROM nginxinc/nginx-unprivileged:1.30-alpine@sha256:56b8272e43a0525f67aed68d1e0794a712d10e3e45a563e118e9a77c817e6f86 AS site
COPY deploy/site/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=site-export . /usr/share/nginx/html
EXPOSE 8080
