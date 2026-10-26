# Production image: one service runs the API and serves the built web app
# (/) and the staff preview (/tabyan-staff-preview/) on the same origin.
FROM node:24.20.0-bookworm

WORKDIR /app
ENV CI=true

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

RUN PORT=5173 BASE_PATH=/ npm run build --workspace @workspace/tabyan \
 && PORT=5174 BASE_PATH=/tabyan-staff-preview/ npm run build --workspace @workspace/tabyan-staff-preview \
 && NODE_ENV=production npm run build --workspace @workspace/api-server

ENV NODE_ENV=production \
    TABYAN_WEB_DIST=/app/apps/web/dist/public \
    TABYAN_STAFF_PREVIEW_DIST=/app/apps/staff-preview/dist/public

WORKDIR /app/apps/api
CMD ["node", "--enable-source-maps", "dist/index.mjs"]
