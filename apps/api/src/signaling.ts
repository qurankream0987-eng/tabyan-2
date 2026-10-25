import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { db, sessions } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createContext } from "@workspace/tabyan-trpc";
import { logger } from "./lib/logger";

/* إشارة WebRTC للحلقات المباشرة — ترحيل offer/answer/ICE بين المشاركين.
   الأمان: لا انضمام إلا بعد التحقق الخادمي من (1) رمز الجلسة (2) عضوية
   المستخدم في الحلقة (معلمها أو طالبها) أو كونه مشرفاً. معرف الجلسة وحده
   لا يكفي لدخول الغرفة. */

type Peer = { id: string; ws: WebSocket; name: string; role: string; recordingConsent: boolean };
const rooms = new Map<string, Map<string, Peer>>();

type ClientMsg =
  | { t: "auth"; token: string }
  | { t: "join"; sessionId: string }
  | { t: "signal"; to: string; data: unknown }
  | { t: "recording-consent"; accepted: boolean }
  | { t: "leave" };

function send(ws: WebSocket, msg: unknown) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

export function attachSessionCallSignaling(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const pathname = (req.url ?? "").split("?")[0];
    if (pathname !== "/api/ws/session-call") {
      // توجد قنوات WebSocket مستقلة أخرى على نفس HTTP server؛ لا نغلق
      // المقبس هنا حتى تصل إليه معالجات upgrade اللاحقة.
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });

  // نبضة دورية تُبقي الاتصال حياً عبر البروكسيات وتسقط المآخذ الميتة
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      const p = ws as WebSocket & { isAlive?: boolean };
      if (p.isAlive === false) { p.terminate(); continue; }
      p.isAlive = false;
      p.ping();
    }
  }, 30000);
  wss.on("close", () => clearInterval(heartbeat));

  wss.on("connection", (rawWs) => {
    const ws = rawWs as WebSocket & { isAlive?: boolean };
    ws.isAlive = true;
    ws.on("pong", () => { ws.isAlive = true; });

    let user: { id: string; fullName: string; role: string } | null = null;
    let peerId = "";
    let roomId: string | null = null;

    // مهلة المصادقة: اتصال بلا رمز صالح يُغلق سريعاً
    const authTimeout = setTimeout(() => {
      if (!user) { send(ws, { t: "error", message: "انتهت مهلة المصادقة" }); ws.close(); }
    }, 10000);

    const leaveRoom = () => {
      if (!roomId) return;
      const room = rooms.get(roomId);
      room?.delete(peerId);
      if (room && room.size === 0) rooms.delete(roomId);
      else room?.forEach((p) => send(p.ws, { t: "peer-left", peerId }));
      roomId = null;
    };

    ws.on("message", (raw) => {
      let msg: ClientMsg;
      try { msg = JSON.parse(String(raw)); } catch { return; }

      if (msg.t === "auth") {
        void (async () => {
          try {
            const ctx = await createContext({
              req: { headers: { authorization: `Bearer ${msg.token}` } },
              res: null,
            } as unknown as Parameters<typeof createContext>[0]);
            if (!ctx.user) { send(ws, { t: "error", message: "رمز الجلسة غير صالح" }); ws.close(); return; }
            user = ctx.user;
            peerId = `${user.id}:${crypto.randomUUID().slice(0, 8)}`;
            clearTimeout(authTimeout);
            send(ws, { t: "hello", selfId: peerId, name: user.fullName, role: user.role });
          } catch {
            send(ws, { t: "error", message: "فشل التحقق من الجلسة" });
            ws.close();
          }
        })();
        return;
      }

      if (!user) return; // تجاهل أي رسالة قبل المصادقة

      if (msg.t === "join") {
        void (async () => {
          const sessionId = String(msg.sessionId ?? "");
          try {
            const [s] = await db
              .select({ teacherId: sessions.teacherId, studentId: sessions.studentId, status: sessions.status })
              .from(sessions).where(eq(sessions.id, sessionId)).limit(1);
            const isMember =
              !!s && (user.role === "admin" || user.id === s.teacherId || user.id === s.studentId);
            if (!isMember) {
              send(ws, { t: "error", message: "لا تملك صلاحية الدخول إلى هذه الحلقة" });
              ws.close();
              return;
            }
            // لا وسائط إلا لحلقة جارية فعلياً — يمنع الانضمام اليدوي لحلقة مجدولة/منتهية
            if (s.status !== "in_progress") {
              send(ws, { t: "error", message: "الحلقة ليست جارية الآن" });
              ws.close();
              return;
            }
            leaveRoom();
            roomId = sessionId;
            let room = rooms.get(roomId);
            if (!room) { room = new Map(); rooms.set(roomId, room); }
            const existing = [...room.values()].map((p) => ({
              peerId: p.id, name: p.name, role: p.role, recordingConsent: p.recordingConsent,
            }));
            const me: Peer = { id: peerId, ws, name: user.fullName, role: user.role, recordingConsent: false };
            room.set(peerId, me);
            send(ws, { t: "joined", peers: existing });
            room.forEach((p) => {
              if (p.id !== peerId) {
                send(p.ws, {
                  t: "peer-joined",
                  peer: { peerId, name: me.name, role: me.role, recordingConsent: false },
                });
              }
            });
          } catch (e) {
            logger.error({ err: e }, "session-call join failed");
            send(ws, { t: "error", message: "تعذر الانضمام إلى الحلقة" });
          }
        })();
        return;
      }

      if (msg.t === "signal" && roomId) {
        const target = rooms.get(roomId)?.get(String(msg.to ?? ""));
        if (target) send(target.ws, { t: "signal", from: peerId, data: msg.data });
        return;
      }

      if (msg.t === "recording-consent" && roomId) {
        const peer = rooms.get(roomId)?.get(peerId);
        if (!peer) return;
        peer.recordingConsent = msg.accepted === true;
        rooms.get(roomId)?.forEach((participant) => {
          if (participant.id !== peerId) {
            send(participant.ws, { t: "recording-consent", peerId, accepted: peer.recordingConsent });
          }
        });
        return;
      }

      if (msg.t === "leave") leaveRoom();
    });

    ws.on("close", leaveRoom);
    ws.on("error", () => leaveRoom());
  });

  logger.info("session-call signaling attached at /api/ws/session-call");
}
