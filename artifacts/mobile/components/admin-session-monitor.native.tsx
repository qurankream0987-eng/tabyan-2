import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import {
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCView,
} from "react-native-webrtc";
import { useAuth } from "../lib/auth";
import { apiOrigin } from "../lib/trpc";
import { storage } from "../lib/storage";
import { useTheme } from "../lib/theme";

type MonitorPhase = "connecting" | "joined" | "connected" | "reconnecting" | "failed" | "ended";
type PeerState = "new" | "connecting" | "connected" | "disconnected" | "failed";
type SignalData = {
  desc?: { sdp: string; type: string | null };
  candidate?: { candidate?: string; sdpMLineIndex?: number | null; sdpMid?: string | null } | null;
};
type PeerInfo = {
  peerId: string;
  name: string;
  role: string;
  stream: MediaStream | null;
  state: PeerState;
};
type PeerRecord = {
  name: string;
  role: string;
  pc: RTCPeerConnection;
  remoteSet: boolean;
  candidates: SignalData["candidate"][];
  makingOffer: boolean;
  ignoreOffer: boolean;
  chain: Promise<void>;
};
type SignalingSocket = {
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onerror: (() => void) | null;
  onclose: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
};

export type AdminSessionMonitorProps = {
  sessionId: string;
  sessionStatus: string;
};

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
];

function websocketOrigin() {
  return apiOrigin().replace(/^http:/, "ws:").replace(/^https:/, "wss:").replace(/\/$/, "");
}

function roleLabel(role: string) {
  if (role === "teacher") return "المعلم";
  if (role === "student") return "الطالب";
  if (role === "admin") return "المشرف";
  return "مشارك";
}

function phaseLabel(phase: MonitorPhase) {
  if (phase === "connecting") return "جارٍ الاتصال بخادم الإشارة…";
  if (phase === "joined") return "تم دخول الغرفة — بانتظار اتصال الوسائط…";
  if (phase === "connected") return "متصل فعليًا ببث مباشر";
  if (phase === "reconnecting") return "انقطع الاتصال — جارٍ إعادة المحاولة…";
  if (phase === "ended") return "انتهت الجلسة أو لم تعد متاحة";
  return "تعذر الاتصال";
}

export default function AdminSessionMonitor({ sessionId, sessionStatus }: AdminSessionMonitorProps) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const [phase, setPhase] = useState<MonitorPhase>("connecting");
  const [error, setError] = useState("");
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const peersRef = useRef(new Map<string, PeerRecord>());
  const socketRef = useRef<SignalingSocket | null>(null);
  const selfIdRef = useRef("");
  const generationRef = useRef(0);

  useEffect(() => {
    const generation = ++generationRef.current;
    if (!sessionId || sessionStatus !== "in_progress") {
      setPhase("ended");
      setError("لا يمكن فتح المراقبة قبل بدء الجلسة.");
      return;
    }

    let cancelled = false;
    let intentionallyClosed = false;
    let fatal = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let reconnectAttempt = 0;
    const isCurrent = () => !cancelled && !fatal && generationRef.current === generation;

    const send = (message: unknown) => {
      if (!isCurrent()) return;
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
    };

    const setPeerState = (peerId: string, state: PeerState) => {
      if (!isCurrent()) return;
      setPeers((current) => current.map((peer) => peer.peerId === peerId ? { ...peer, state } : peer));
    };

    const hasConnectedPeer = () => [...peersRef.current.values()].some((peer) => peer.pc.connectionState === "connected");

    const removePeer = (peerId: string) => {
      const record = peersRef.current.get(peerId);
      if (!record) return;
      record.pc.onnegotiationneeded = null;
      record.pc.onicecandidate = null;
      record.pc.ontrack = null;
      record.pc.onconnectionstatechange = null;
      record.pc.close();
      peersRef.current.delete(peerId);
      if (!isCurrent()) return;
      setPeers((current) => current.filter((peer) => peer.peerId !== peerId));
      if (!hasConnectedPeer() && !fatal && !cancelled) setPhase("reconnecting");
    };

    const closePeers = () => {
      peersRef.current.forEach((record) => {
        record.pc.onnegotiationneeded = null;
        record.pc.onicecandidate = null;
        record.pc.ontrack = null;
        record.pc.onconnectionstatechange = null;
        record.pc.close();
      });
      peersRef.current.clear();
      if (isCurrent()) setPeers([]);
    };

    const sendSignal = (peerId: string, data: SignalData) => {
      send({ t: "signal", to: peerId, data });
    };

    const createPeer = (peerId: string, name: string, role: string) => {
      const existing = peersRef.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const record: PeerRecord = {
        name, role, pc, remoteSet: false, candidates: [], makingOffer: false, ignoreOffer: false,
        chain: Promise.resolve(),
      };
      peersRef.current.set(peerId, record);
      if (!isCurrent()) return record;
      setPeers((current) => current.some((peer) => peer.peerId === peerId)
        ? current
        : [...current, { peerId, name, role, stream: null, state: "new" }]);

      // Observer is receive-only: this never requests or adds a local camera/microphone track.
      pc.addTransceiver("audio", { direction: "recvonly" });
      pc.addTransceiver("video", { direction: "recvonly" });

      pc.onnegotiationneeded = async () => {
        if (!isCurrent()) return;
        try {
          record.makingOffer = true;
          await pc.setLocalDescription();
          if (isCurrent() && pc.localDescription) sendSignal(peerId, { desc: pc.localDescription.toJSON() });
        } catch {
          if (isCurrent()) setPeerState(peerId, "failed");
        } finally {
          record.makingOffer = false;
        }
      };
      pc.onicecandidate = (event: { candidate?: { toJSON?: () => SignalData["candidate"] } | null }) => {
        if (!isCurrent()) return;
        sendSignal(peerId, { candidate: event.candidate ? event.candidate.toJSON?.() ?? null : null });
      };
      pc.ontrack = (event: { streams?: MediaStream[]; track?: { onended: (() => void) | null } }) => {
        if (!isCurrent()) return;
        const stream = event.streams?.[0];
        if (!stream) return;
        setPeers((current) => current.map((peer) => peer.peerId === peerId ? { ...peer, stream, state: "connected" } : peer));
      };
      pc.onconnectionstatechange = () => {
        if (!isCurrent()) return;
        const state = pc.connectionState;
        if (state === "connected") {
          setPeerState(peerId, "connected");
          setPhase("connected");
          setError("");
        } else if (state === "connecting" || state === "new") {
          setPeerState(peerId, "connecting");
        } else if (state === "disconnected") {
          setPeerState(peerId, "disconnected");
          if (!hasConnectedPeer()) {
            setPhase("reconnecting");
            setError("فقدت شبكة الاتصال مع وسائط المشاركين.");
          }
        } else if (state === "failed" || state === "closed") {
          setPeerState(peerId, "failed");
          removePeer(peerId);
        }
      };
      return record;
    };

    const handleSignal = (peerId: string, data: SignalData) => {
      const record = peersRef.current.get(peerId);
      if (!record) return;
      record.chain = record.chain.then(async () => {
        if (!isCurrent() || peersRef.current.get(peerId) !== record) return;
        if (data.desc) {
          const offerCollision =
            data.desc.type === "offer" && (record.makingOffer || record.pc.signalingState !== "stable");
          record.ignoreOffer = selfIdRef.current > peerId && offerCollision;
          if (record.ignoreOffer) return;
          await record.pc.setRemoteDescription(new RTCSessionDescription(data.desc));
          record.remoteSet = true;
          for (const candidate of record.candidates) {
            try {
              await record.pc.addIceCandidate(candidate ? new RTCIceCandidate(candidate) : null);
            } catch {
              // Candidate can be stale during a reconnect; the next ICE cycle remains valid.
            }
          }
          record.candidates = [];
          if (data.desc.type === "offer") {
            await record.pc.setLocalDescription();
            if (record.pc.localDescription) sendSignal(peerId, { desc: record.pc.localDescription.toJSON() });
          }
        } else if ("candidate" in data) {
          if (!record.remoteSet) {
            record.candidates.push(data.candidate ?? null);
            return;
          }
          try {
            await record.pc.addIceCandidate(data.candidate ? new RTCIceCandidate(data.candidate) : null);
          } catch {
            if (!record.ignoreOffer) throw new Error("ICE candidate rejected");
          }
        }
      }).catch(() => {
        if (isCurrent()) setPeerState(peerId, "failed");
      });
    };

    const describeServerError = (message: string) => {
      if (message.includes("رمز") || message.includes("صلاحية")) return "انتهت صلاحية الجلسة أو لا تملك صلاحية مراقبتها.";
      if (message.includes("ليست جارية")) return "انتهت الجلسة أو لم تبدأ بعد.";
      return message || "تعذر الانضمام إلى جلسة المراقبة.";
    };

    const scheduleReconnect = () => {
      if (!isCurrent()) return;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      const delay = Math.min(1000 * 2 ** reconnectAttempt, 8000);
      reconnectAttempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        if (isCurrent()) void connect();
      }, delay);
    };

    const connect = async () => {
      if (!isCurrent()) return;
      const currentToken = token ?? await storage.getToken();
      if (!isCurrent()) return;
      if (!currentToken) {
        fatal = true;
        setPhase("failed");
        setError("انتهت جلسة الدخول. سجّل الدخول مرة أخرى.");
        return;
      }

      setPhase(reconnectAttempt === 0 ? "connecting" : "reconnecting");
      closePeers();
      const previousSocket = socketRef.current;
      if (previousSocket) {
        previousSocket.onopen = null;
        previousSocket.onerror = null;
        previousSocket.onclose = null;
        previousSocket.onmessage = null;
        previousSocket.close();
        socketRef.current = null;
      }
      const socket = new WebSocket(`${websocketOrigin()}/api/ws/session-call`) as unknown as SignalingSocket;
      socketRef.current = socket;
      socket.onopen = () => {
        if (!isCurrent() || socketRef.current !== socket) return;
        send({ t: "auth", token: currentToken });
      };
      socket.onerror = () => {
        if (isCurrent() && socketRef.current === socket) {
          setPhase("reconnecting");
          setError("تعذر الوصول إلى خادم الاتصال.");
        }
      };
      socket.onclose = () => {
        if (!isCurrent() || socketRef.current !== socket || intentionallyClosed) return;
        socketRef.current = null;
        closePeers();
        setPhase("reconnecting");
        setError("انقطع اتصال الإشارة. جارٍ إعادة المحاولة…");
        scheduleReconnect();
      };
      socket.onmessage = (event) => {
        if (!isCurrent() || socketRef.current !== socket) return;
        let message: Record<string, unknown>;
        try { message = JSON.parse(String(event.data)) as Record<string, unknown>; } catch { return; }
        if (message.t === "hello") {
          selfIdRef.current = String(message.selfId ?? "");
          send({ t: "join", sessionId });
        } else if (message.t === "joined") {
          reconnectAttempt = 0;
          setPhase("joined");
          const existing = Array.isArray(message.peers) ? message.peers as { peerId: string; name: string; role: string }[] : [];
          existing.forEach((peer) => createPeer(peer.peerId, peer.name, peer.role));
        } else if (message.t === "peer-joined") {
          const peer = message.peer as { peerId: string; name: string; role: string };
          if (peer?.peerId) createPeer(peer.peerId, peer.name, peer.role);
        } else if (message.t === "peer-left") {
          removePeer(String(message.peerId ?? ""));
        } else if (message.t === "signal") {
          handleSignal(String(message.from ?? ""), message.data as SignalData);
        } else if (message.t === "error") {
          fatal = true;
          const text = describeServerError(String(message.message ?? ""));
          setPhase(text.includes("انتهت") ? "ended" : "failed");
          setError(text);
          socket.onopen = null;
          socket.onerror = null;
          socket.onclose = null;
          socket.onmessage = null;
          socket.close();
          socketRef.current = null;
        }
      };
    };

    void connect();
    return () => {
      cancelled = true;
      intentionallyClosed = true;
      fatal = true;
      generationRef.current += 1;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket) {
        socket.onopen = null;
        socket.onerror = null;
        socket.onclose = null;
        socket.onmessage = null;
        socket.close();
      }
      closePeers();
      setPeers([]);
    };
  }, [sessionId, sessionStatus, token]);

  const connectedPeer = peers.some((peer) => peer.state === "connected");
  const visiblePeers = peers.filter((peer) => peer.role !== "admin");

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.statusRow}>
          {phase === "connecting" || phase === "reconnecting" ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          <Text style={[styles.status, { color: phase === "connected" ? colors.success : phase === "failed" ? colors.danger : colors.primary }]}>
            {phaseLabel(phase)}
          </Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>المراقبة الحية</Text>
      </View>

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {phase === "joined" && peers.length === 0 ? (
        <Text style={[styles.empty, { color: colors.muted }]}>بانتظار انضمام المعلم والطالب إلى الجلسة…</Text>
      ) : null}
      {phase === "connected" && !connectedPeer ? (
        <Text style={[styles.empty, { color: colors.muted }]}>تم فقدان الوسائط مؤقتًا — جارٍ إعادة الاتصال.</Text>
      ) : null}
      {visiblePeers.map((peer) => (
        <View key={peer.peerId} style={[styles.peerCard, { borderColor: colors.border }]}>
          {peer.stream ? (
            <RTCView streamURL={peer.stream.toURL()} objectFit="cover" style={styles.video} />
          ) : (
            <View style={[styles.noMedia, { backgroundColor: colors.input }]}>
              <Text style={[styles.noMediaText, { color: colors.muted }]}>لا توجد وسائط مستلمة بعد</Text>
            </View>
          )}
          <View style={styles.peerFooter}>
            <Text style={[styles.peerName, { color: colors.text }]}>{peer.name}</Text>
            <Text style={[styles.peerMeta, { color: colors.muted }]}>{roleLabel(peer.role)} · {peer.state === "connected" ? "متصل" : "جارٍ الاتصال"}</Text>
          </View>
        </View>
      ))}
      {phase === "failed" || phase === "ended" ? (
        <Text style={[styles.empty, { color: colors.muted }]}>لم يتم عرض اتصال ناجح؛ تحقق من صلاحية الجلسة وحالة الشبكة.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, textAlign: "right" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 7, flexShrink: 1 },
  status: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "left" },
  error: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 20, textAlign: "right", marginTop: 10 },
  empty: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 22, textAlign: "right", marginTop: 16 },
  peerCard: { borderWidth: 1, borderRadius: 12, overflow: "hidden", marginTop: 14 },
  video: { width: "100%", height: 190, backgroundColor: "#111827" },
  noMedia: { height: 100, alignItems: "center", justifyContent: "center" },
  noMediaText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12 },
  peerFooter: { padding: 10, alignItems: "flex-end" },
  peerName: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14 },
  peerMeta: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, marginTop: 3 },
});