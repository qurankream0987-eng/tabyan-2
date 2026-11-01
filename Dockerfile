# Production image: one service runs the API and serves the built web app
# (/) and the staff preview (/tabyan-staff-preview/) on the same origin.
FROM node:24.20.0-bookworm-slim

WORKDIR /app
ENV CI=true \
    ONNXRUNTIME_NODE_INSTALL=skip

# One COPY: Railway's builder failed to mount the stack of per-package COPY
# layers ("overlay ... invalid argument") before npm ci.
COPY . .
RUN npm ci --no-audit --no-fund

# The Mushaf page fonts and word data are too large for Railway's upload limit;
# they come from the object storage bucket (see tools/scripts/build-assets.mjs).
# Railway passes these service variables in as build arguments.
ARG RAILWAY_BUCKET_ENDPOINT
ARG RAILWAY_BUCKET_S3_NAME
ARG RAILWAY_BUCKET_ACCESS_KEY_ID
ARG RAILWAY_BUCKET_SECRET_ACCESS_KEY
ARG RAILWAY_BUCKET_URL_STYLE
RUN node tools/scripts/build-assets.mjs fetch

# Live recitation model (provider "tilawi"), pinned and checksum-verified.
# onnxruntime-node ships binaries for every platform; keep only linux.
RUN node tools/scripts/fetch-asr-model.mjs \
 && rm -rf node_modules/onnxruntime-node/bin/napi-v6/darwin node_modules/onnxruntime-node/bin/napi-v6/win32

RUN PORT=5173 BASE_PATH=/ npm run build --workspace @workspace/tabyan \
 && PORT=5174 BASE_PATH=/tabyan-staff-preview/ npm run build --workspace @workspace/tabyan-staff-preview \
 && NODE_ENV=production npm run build --workspace @workspace/api-server

ENV NODE_ENV=production \
    TABYAN_WEB_DIST=/app/apps/web/dist/public \
    TABYAN_STAFF_PREVIEW_DIST=/app/apps/staff-preview/dist/public \
    TABYAN_TILAWI_MODEL_DIR=/app/apps/api/models/tilawi

WORKDIR /app/apps/api
CMD ["node", "--enable-source-maps", "dist/index.mjs"]
