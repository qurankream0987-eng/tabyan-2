# Production image: one service runs the API and serves the built web app
# (/) and the staff preview (/tabyan-staff-preview/) on the same origin.
FROM node:24.20.0-bookworm-slim

# ffmpeg converts uploaded videos that do not play everywhere (iPhone HEVC, WebM,
# heavy 1080p) to H.264/AAC 720p; see apps/api/src/media/videoNormalization.ts.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg python3 python3-venv libgomp1 \
 && python3 -m venv /opt/tarteel \
 && /opt/tarteel/bin/pip install --no-cache-dir "faster-whisper==1.2.1" \
 && /opt/tarteel/bin/python -c "from huggingface_hub import snapshot_download, hf_hub_download; import shutil; snapshot_download(repo_id='kaylazima/quranic-model', revision='9fee6e6bca1099abef1c280e79be43a8f74d78b9', allow_patterns=['whisper-quran-ct2/*'], local_dir='/opt/tarteel/model'); shutil.copy(hf_hub_download('openai/whisper-base', 'tokenizer.json'), '/opt/tarteel/model/whisper-quran-ct2/tokenizer.json')" \
 && test -s /opt/tarteel/model/whisper-quran-ct2/model.bin \
 && test -s /opt/tarteel/model/whisper-quran-ct2/tokenizer.json \
 && rm -rf /var/lib/apt/lists/* /root/.cache

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
    TABYAN_TILAWI_MODEL_DIR=/app/apps/api/models/tilawi \
    TABYAN_TARTEEL_PYTHON=/opt/tarteel/bin/python \
    TABYAN_TARTEEL_MODEL_PATH=/opt/tarteel/model/whisper-quran-ct2

WORKDIR /app/apps/api
CMD ["node", "--enable-source-maps", "dist/index.mjs"]
