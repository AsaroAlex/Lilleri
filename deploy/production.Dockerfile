# syntax=docker/dockerfile:1
# Hosted production image: PostgreSQL, hosted identity, sealed key vault and the web app.
# The synthetic preview keeps using the root Dockerfile.
FROM node:22.22.0-bookworm-slim
WORKDIR /app
RUN npm install --global pnpm@10.28.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/brand/package.json packages/brand/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/engines/package.json packages/engines/package.json
COPY packages/financial-providers/package.json packages/financial-providers/package.json
COPY packages/money/package.json packages/money/package.json
RUN CI=1 pnpm install --frozen-lockfile
COPY . .
RUN node tools/production/build.mjs

ENV NODE_ENV=production \
    PORT=8080 \
    LILLERI_DATA_DIR=/data
# Mount a persistent volume at /data: it holds the sealed key vault and the erasure journal,
# which must never be stored with the database or its backups.
EXPOSE 8080
STOPSIGNAL SIGTERM
CMD ["node", "apps/api/dist/server-hosted.js"]
