/**
 * @license
 * Tabyan Smart Mushaf — Full-Stack Server & Nabr QRC Secure Gateway
 * Strict Invariant: NABR_QRC_API_KEY is isolated on server side and NEVER exposed to client.
 */

import http from 'http';
import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { validateRiffWavChunk } from './src/audio/validation/wavValidator';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const NABR_QRC_ENDPOINT = process.env.NABR_QRC_ENDPOINT || 'wss://api.qurani.ai';
const NABR_QRC_API_KEY = process.env.NABR_QRC_API_KEY || '';

const app = express();
app.use(express.json());

// 1. Health & Gateway Diagnostics Endpoint
app.get('/api/qrc/status', (_req: Request, res: Response) => {
  res.json({
    status: 'ACTIVE',
    serverKeyConfigured: Boolean(NABR_QRC_API_KEY && NABR_QRC_API_KEY.length > 0),
    endpoint: NABR_QRC_ENDPOINT,
    audioContract: {
      format: 'PCM16_RIFF_WAV',
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      chunkDurationMs: 200,
    },
  });
});

const server = http.createServer(app);

// 2. WebSocket Gateway Server for Client Recitation Audio & Observations
const wss = new WebSocketServer({ server, path: '/api/qrc-ws' });

wss.on('connection', (clientWs: WebSocket) => {
  let upstreamWs: WebSocket | null = null;
  let sessionActive = false;

  const cleanupUpstream = () => {
    if (upstreamWs) {
      if (upstreamWs.readyState === WebSocket.OPEN || upstreamWs.readyState === WebSocket.CONNECTING) {
        upstreamWs.close(1000, 'Client disconnected');
      }
      upstreamWs = null;
    }
    sessionActive = false;
  };

  clientWs.on('message', (data: Buffer | ArrayBuffer, isBinary: boolean) => {
    if (!isBinary) {
      // Text control messages (e.g. START_TILAWA_SESSION, RESET_TILAWA_SESSION)
      try {
        const text = data.toString();
        const payload = JSON.parse(text);

        if (payload.method === 'START_TILAWA_SESSION') {
          sessionActive = true;

          // If server key is configured, connect to live upstream Nabr gateway
          if (NABR_QRC_API_KEY) {
            try {
              upstreamWs = new WebSocket(NABR_QRC_ENDPOINT, {
                headers: {
                  Authorization: `Bearer ${NABR_QRC_API_KEY}`,
                },
              });

              upstreamWs.on('open', () => {
                upstreamWs?.send(JSON.stringify(payload));
              });

              upstreamWs.on('message', (upstreamData: any) => {
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(upstreamData);
                }
              });

              upstreamWs.on('close', (code, reason) => {
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(
                    JSON.stringify({
                      event: 'QRC_SESSION_CLOSED',
                      code,
                      reason: reason.toString(),
                    })
                  );
                }
              });

              upstreamWs.on('error', (err) => {
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(
                    JSON.stringify({
                      event: 'QRC_ERROR',
                      message: 'خطأ في الاتصال بخادم نبر الخارجي',
                      detail: err.message,
                    })
                  );
                }
              });
            } catch (err: any) {
              clientWs.send(
                JSON.stringify({
                  event: 'QRC_ERROR',
                  message: 'تعذر تهيئة الاتصال بخادم نبر',
                  detail: err.message,
                })
              );
            }
          } else {
            // Server gateway is ready, but upstream API key is pending configuration
            clientWs.send(
              JSON.stringify({
                event: 'GATEWAY_READY_PENDING_KEY',
                message: 'بوابة خادم تبيان جاهزة وبانتظار اعتماد مفتاح نبر',
              })
            );
          }
        } else if (payload.method === 'RESET_TILAWA_SESSION') {
          if (upstreamWs && upstreamWs.readyState === WebSocket.OPEN) {
            upstreamWs.send(text);
          }
        }
      } catch {
        // Safe json parse error ignore
      }
      return;
    }

    // Binary audio message: validate Audio Contract (16 kHz, Mono, PCM16, standalone RIFF/WAV)
    const validation = validateRiffWavChunk(data as Buffer);
    if (!validation.isValid) {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            event: 'QRC_ERROR',
            code: 'MALFORMED_AUDIO_CHUNK',
            message: `رفض الحزمة الصوتية: ${validation.error}`,
          })
        );
      }
      return;
    }

    // Forward validated chunk to upstream Nabr gateway if connected
    if (sessionActive && upstreamWs && upstreamWs.readyState === WebSocket.OPEN) {
      upstreamWs.send(data);
    }
  });

  clientWs.on('close', () => {
    cleanupUpstream();
  });

  clientWs.on('error', () => {
    cleanupUpstream();
  });
});

// 3. Mount Vite Dev Middlewares in Dev or Static Assets in Production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Tabyan Gateway] Server listening on http://0.0.0.0:${PORT}`);
    console.log(`[Tabyan Gateway] QRC WebSocket gateway ready at ws://0.0.0.0:${PORT}/api/qrc-ws`);
    console.log(`[Tabyan Gateway] Upstream Nabr API Key Configured: ${Boolean(NABR_QRC_API_KEY)}`);
  });
}

startServer().catch((err) => {
  console.error('[Tabyan Gateway] Failed to start server:', err);
  process.exit(1);
});
