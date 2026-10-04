# syntax=docker/dockerfile:1
# Synthetic development preview. This image is not a production banking deployment.
FROM node:22.22.0-bookworm-slim
WORKDIR /app

# Railway Metal supports cache mounts only; keep this image independent of build-host certificates.
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
RUN pnpm preview:build

# Mount /data at runtime: database and its independent keys/journals must all survive redeploys.
ENV NODE_ENV=development \
    PORT=8080 \
    DEV_HOST=0.0.0.0 \
    DEV_DATA_PATH=/data/database \
    DEV_RECOVERY_PATH=/data/recovery
EXPOSE 8080
STOPSIGNAL SIGTERM
CMD ["node", "tools/preview/run.mjs"]
