import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import {
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCView,
  mediaDevices,
} from "react-native-webrtc";
import { Button } from "./ui";
import { useAuth } from "../lib/auth";
import { apiOrigin } from "../lib/trpc";
import { storage } from "../lib/storage";
import { useTheme } from "../lib/theme";

type Phase = "permission" | "connecting" | "joined" | "connected" | "reconnecting" | "failed" | "ended";
type PeerState = "new" | "connecting" | "connected" | "disconnected" | "failed";
type SignalData = {
  desc?: { sdp?: string; type?: string | null };
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

export type StudentSessionCallProps = {
  sessionId: string;
  sessionStatus: string;
  displayName?: string | null;
  onLeave: () => void;
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

function phaseLabel(phase: Phase) {
  if (phase === "permission") return "يلزم السماح بالكاميرا والميكروفون";
  if (phase === "connecting") return "جارٍ الاتصال بخادم الحلقة…";
  if (phase === "joined") return "دخلت الغرفة — بانتظار المعلم…";
  if (phase === "connected") return "متصل فعليًا بالمعلم";
  if (phase === "reconnecting") return "انقطع الاتصال — جارٍ إعادة المحاولة…";
  if (phase === "ended") return "انتهت الحلقة أو لم تعد متاحة";
  return "تعذر الاتصال بالحلقة";
}

function roleLabel(role: string) {
  if (role === "teacher") return "المعلم";
  if (role === "admin") return "المشرف";
  return "مشارك";
}

export default function StudentSessionCall({
  sessionId,
  sessionStatus,
  displayName,
  onLeave,
}: StudentSessionCallProps) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const [phase, setPhase] = useState<Phase>(sessionStatus === "in_progress" ? "permission" : "ended");
  const [error, setError] = useState("");
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const peersRef = useRef(new Map<string, PeerRecord>());
  const socketRef = useRef<SignalingSocket | null>(null);
  const selfIdRef = useRef("");
  const localRef = useRef<MediaStream | null>(null);
  const cancelledRef = useRef(false);
  const intentionalCloseRef = useRef(false);
  const fatalRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reconnectAttemptRef = useRef(0);
  const generationRef = useRef(0);

  useEffect(() => {
    const generation = ++generationRef.current;
    if (!sessionId || sessionStatus !== "in_progress") {
      setPhase("ended");
      setError("لا يمكن دخول الحلقة قبل أن تبدأ.");
      return;
    }

    cancelledRef.current = false;
    intentionalCloseRef.current = false;
    fatalRef.current = false;
    let mounted = true;
    const isCurrent = () => mounted
      && !cancelledRef.current
      && !fatalRef.current
      && generationRef.current === generation;

    const setPeerState = (peerId: string, state: PeerState) => {
      if (!isCurrent()) return;
      setPeers((current) => current.map((peer) => peer.peerId === peerId ? { ...peer, state } : peer));
    };

    const hasConnectedTeacher = () => [...peersRef.current.values()]
      .some((peer) => peer.role === "teacher" && peer.pc.connectionState === "connected");

    const removePeer = (peerId: string) => {
      const record = peersRef.current.get(peerId);
      if (!record) return;
      record.pc.onnegotiationneeded = null;
      record.pc.onicecandidate = null;
      record.pc.ontrack = null;
      record.pc.onconnectionstatechange = null;
      (record.pc as any).handleSignal = undefined;
      record.pc.close();
      peersRef.current.delete(peerId);
      if (!isCurrent()) return;
      setPeers((current) => current.filter((peer) => peer.peerId !== peerId));
      if (!hasConnectedTeacher() && !fatalRef.current && !cancelledRef.current) setPhase("joined");
    };

    const closePeers = () => {
      peersRef.current.forEach((record) => {
        record.pc.onnegotiationneeded = null;
        record.pc.onicecandidate = null;
        record.pc.ontrack = null;
        record.pc.onconnectionstatechange = null;
        (record.pc as any).handleSignal = undefined;
        record.pc.close();
      });
      peersRef.current.clear();
      if (isCurrent()) setPeers([]);
    };

    const send = (message: unknown) => {
      if (!isCurrent()) return;
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
    };

    const sendSignal = (peerId: string, data: SignalData) => {
      send({ t: "signal", to: peerId, data });
    };

    const createPeer = (peerId: string, name: string, role: string): PeerRecord => {
      const existing = peersRef.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const record: PeerRecord = {
        name,
        role,
        pc,
        remoteSet: false,
        candidates: [],
        makingOffer: false,
        ignoreOffer: false,
        chain: Promise.resolve(),
      };
      peersRef.current.set(peerId, record);
      if (!isCurrent()) return record;
      setPeers((current) => current.some((peer) => peer.peerId === peerId)
        ? current
        : [...current, { peerId, name, role, stream: null, state: "new" }]);

      localRef.current?.getTracks().forEach((track) => pc.addTrack(track, localRef.current!));

      (pc as any).onnegotiationneeded = async () => {
        if (!isCurrent()) return;
        try {
          record.makingOffer = true;
          await pc.setLocalDescription();
          if (isCurrent() && pc.localDescription) sendSignal(peerId, { desc: pc.localDescription.toJSON() as any });
        } catch {
          if (isCurrent()) setPeerState(peerId, "failed");
        } finally {
          record.makingOffer = false;
        }
      };
      (pc as any).onicecandidate = (event: any) => {
        if (!isCurrent()) return;
        sendSignal(peerId, { candidate: event.candidate ? event.candidate.toJSON?.() ?? event.candidate : null });
      };
      (pc as any).ontrack = (event: any) => {
        if (!isCurrent()) return;
        const stream = event.streams?.[0] ?? new MediaStream([event.track]);
        setPeers((current) => current.map((peer) => peer.peerId === peerId
          ? { ...peer, stream, state: "connected" }
          : peer));
      };
      (pc as any).onconnectionstatechange = () => {
        if (!isCurrent()) return;
        const state = pc.connectionState;
        if (state === "connected") {
          setPeerState(peerId, "connected");
          if (role === "teacher") {
            setPhase("connected");
            setError("");
          }
        } else if (state === "connecting" || state === "new") {
          setPeerState(peerId, "connecting");
        } else if (state === "disconnected") {
          setPeerState(peerId, "disconnected");
          if (!hasConnectedTeacher()) {
            setPhase("reconnecting");
            setError("فقدت شبكة الاتصال مع المعلم.");
          }
        } else if (state === "failed" || state === "closed") {
          setPeerState(peerId, "failed");
          removePeer(peerId);
        }
      };

      const polite = selfIdRef.current < peerId;
      (record.pc as any).handleSignal = (data: SignalData) => {
        record.chain = record.chain.then(async () => {
          if (!isCurrent() || peersRef.current.get(peerId) !== record) return;
          if (data.desc) {
            const desc = data.desc;
            const offerCollision = desc.type === "offer" && (record.makingOffer || pc.signalingState !== "stable");
            record.ignoreOffer = !polite && offerCollision;
            if (record.ignoreOffer) return;
            await pc.setRemoteDescription(new RTCSessionDescription(desc as any));
            record.remoteSet = true;
            for (const candidate of record.candidates) {
              try {
                await pc.addIceCandidate(candidate ? new RTCIceCandidate(candidate as any) : null);
              } catch {
                // Candidate may belong to a previous ICE cycle.
              }
            }
            record.candidates = [];
            if (desc.type === "offer") {
              await pc.setLocalDescription();
              if (pc.localDescription) sendSignal(peerId, { desc: pc.localDescription.toJSON() as any });
            }
          } else if ("candidate" in data) {
            if (!record.remoteSet) {
              record.candidates.push(data.candidate ?? null);
              return;
            }
            try {
              await pc.addIceCandidate(data.candidate ? new RTCIceCandidate(data.candidate as any) : null);
            } catch {
              if (!record.ignoreOffer) throw new Error("ICE candidate rejected");
            }
          }
        }).catch(() => {
          if (isCurrent()) setPeerState(peerId, "failed");
        });
      };

      return record;
    };

    const closeSocketAndPeers = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = undefined;
      }
      closePeers();
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket) {
        socket.onopen = null;
        socket.onerror = null;
        socket.onclose = null;
        socket.onmessage = null;
        socket.close();
      }
    };

    const scheduleReconnect = () => {
      if (!isCurrent()) return;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      const delay = Math.min(1000 * 2 ** reconnectAttemptRef.current, 8000);
      reconnectAttemptRef.current += 1;
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = undefined;
        if (isCurrent()) void connect();
      }, delay);
    };

    const connect = async (): Promise<void> => {
      if (!isCurrent() || fatalRef.current) return;
      const currentToken = token ?? await storage.getToken();
      if (!isCurrent()) return;
      if (!currentToken) {
        fatalRef.current = true;
        setPhase("failed");
        setError("انتهت جلسة الدخول. سجّل الدخول مرة أخرى.");
        return;
      }

      setPhase(reconnectAttemptRef.current === 0 ? "connecting" : "reconnecting");
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
        if (!isCurrent() || socketRef.current !== socket || intentionalCloseRef.current || fatalRef.current) return;
        socketRef.current = null;
        closePeers();
        setPhase("reconnecting");
        setError("انقطع اتصال الإشارة. جارٍ إعادة المحاولة…");
        scheduleReconnect();
      };
      socket.onmessage = (event) => {
        if (!isCurrent() || socketRef.current !== socket) return;
        let message: Record<string, unknown>;
        try {
          message = JSON.parse(String(event.data)) as Record<string, unknown>;
        } catch {
          return;
        }
        if (message.t === "hello") {
          selfIdRef.current = String(message.selfId ?? "");
          send({ t: "join", sessionId });
        } else if (message.t === "joined") {
          reconnectAttemptRef.current = 0;
          setPhase("joined");
          const existing = Array.isArray(message.peers)
            ? message.peers as Array<{ peerId: string; name: string; role: string }>
            : [];
          existing.forEach((peer) => createPeer(peer.peerId, peer.name, peer.role));
        } else if (message.t === "peer-joined") {
          const peer = message.peer as { peerId: string; name: string; role: string } | undefined;
          if (peer?.peerId) createPeer(peer.peerId, peer.name, peer.role);
        } else if (message.t === "peer-left") {
          removePeer(String(message.peerId ?? ""));
        } else if (message.t === "signal") {
          const record = peersRef.current.get(String(message.from ?? ""));
          const handler = (record?.pc as any)?.handleSignal as ((data: SignalData) => void) | undefined;
          handler?.(message.data as SignalData);
        } else if (message.t === "error") {
          fatalRef.current = true;
          const messageText = String(message.message ?? "تعذر الانضمام إلى الحلقة");
          const ended = messageText.includes("ليست جارية") || messageText.includes("صلاحية");
          setPhase(ended ? "ended" : "failed");
          setError(ended ? "انتهت الجلسة أو لا تملك صلاحية الدخول إليها." : messageText);
          socket.onopen = null;
          socket.onerror = null;
          socket.onclose = null;
          socket.onmessage = null;
          socket.close();
          socketRef.current = null;
        }
      };
    };

    const requestMediaAndConnect = async () => {
      try {
        setPhase("permission");
        setError("");
        const stream = await mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: "user", width: 1280, height: 720 },
        });
        if (!mounted || cancelledRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        localRef.current = stream;
        setLocalStream(stream);
        await connect();
      } catch {
        if (isCurrent()) {
          setPhase("permission");
          setError("يلزم السماح بالكاميرا والميكروفون لدخول الحلقة. امنحهما ثم أعد المحاولة.");
        }
      }
    };

    void requestMediaAndConnect();

    return () => {
      mounted = false;
      cancelledRef.current = true;
      intentionalCloseRef.current = true;
      fatalRef.current = true;
      generationRef.current += 1;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = undefined;
      }
      try {
        if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify({ t: "leave" }));
      } catch {
        // Socket may already be closed.
      }
      closeSocketAndPeers();
      localRef.current?.getTracks().forEach((track) => track.stop());
      localRef.current = null;
      setLocalStream(null);
      setPeers([]);
    };
  }, [sessionId, sessionStatus, token, retryCount]);

  const retry = () => {
    if (phase !== "permission" && phase !== "failed") return;
    setError("");
    setPhase("permission");
    setRetryCount((value) => value + 1);
  };

  const toggleMic = () => {
    localRef.current?.getAudioTracks().forEach((track) => { track.enabled = !micOn; });
    setMicOn((value) => !value);
  };

  const toggleCam = () => {
    localRef.current?.getVideoTracks().forEach((track) => { track.enabled = !camOn; });
    setCamOn((value) => !value);
  };

  const leave = () => {
    onLeave();
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.statusRow}>
          {phase === "connecting" || phase === "reconnecting" ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          <Text style={[styles.status, { color: phase === "connected" ? colors.success : phase === "failed" ? colors.danger : colors.primary }]}>
            {phaseLabel(phase)}
          </Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>الحلقة الحية</Text>
      </View>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {phase === "permission" ? <Button label="السماح بالكاميرا والميكروفون" icon="videocam-outline" onPress={retry} /> : null}
      {phase === "joined" && peers.length === 0 ? <Text style={[styles.empty, { color: colors.muted }]}>تم التحقق من دخولك — بانتظار انضمام المعلم…</Text> : null}
      {phase === "connected" && !peers.some((peer) => peer.role === "teacher" && peer.state === "connected") ? <Text style={[styles.empty, { color: colors.muted }]}>تم فقدان الوسائط مؤقتًا — جارٍ إعادة الاتصال.</Text> : null}
      {localStream ? (
        <View style={[styles.tile, { borderColor: colors.border }]}>
          <RTCView streamURL={localStream.toURL()} objectFit="cover" mirror style={styles.video} />
          <Text style={[styles.tileLabel, { color: colors.text, backgroundColor: colors.card }]}>أنت — {displayName || "الطالب"}</Text>
        </View>
      ) : null}
      {peers.map((peer) => (
        <View key={peer.peerId} style={[styles.tile, { borderColor: colors.border }]}>
          {peer.stream ? (
            <RTCView streamURL={peer.stream.toURL()} objectFit="cover" style={styles.video} />
          ) : (
            <View style={[styles.noMedia, { backgroundColor: colors.input }]}>
              <Text style={[styles.noMediaText, { color: colors.muted }]}>بانتظار وسائط {roleLabel(peer.role)}…</Text>
            </View>
          )}
          <Text style={[styles.tileLabel, { color: colors.text, backgroundColor: colors.card }]}>{peer.name} — {roleLabel(peer.role)}</Text>
        </View>
      ))}
      {phase === "failed" || phase === "ended" ? <Text style={[styles.empty, { color: colors.muted }]}>لم يتم إنشاء اتصال ناجح. تحقق من حالة الجلسة والشبكة.</Text> : null}
      {localStream && phase !== "ended" ? (
        <View style={styles.controls}>
          <Control label={micOn ? "كتم الصوت" : "تشغيل الصوت"} icon={micOn ? "🎙️" : "🔇"} active={micOn} onPress={toggleMic} colors={colors} />
          <Control label={camOn ? "إيقاف الكاميرا" : "تشغيل الكاميرا"} icon={camOn ? "📹" : "🚫"} active={camOn} onPress={toggleCam} colors={colors} />
          <Control label="مغادرة" icon="↩" active={false} danger onPress={leave} colors={colors} />
        </View>
      ) : null}
    </View>
  );
}

function Control({
  label,
  icon,
  active,
  danger,
  onPress,
  colors,
}: {
  label: string;
  icon: string;
  active: boolean;
  danger?: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.control, { backgroundColor: danger ? `${colors.danger}18` : active ? `${colors.primary}18` : colors.input, borderColor: danger ? colors.danger : colors.border }]}>
      <Text style={styles.controlIcon}>{icon}</Text>
      <Text style={[styles.controlLabel, { color: danger ? colors.danger : colors.text }]}>{label}</Text>
    </Pressable>
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
  tile: { borderWidth: 1, borderRadius: 12, overflow: "hidden", marginTop: 14, backgroundColor: "#111827" },
  video: { width: "100%", height: 210, backgroundColor: "#111827" },
  noMedia: { height: 110, alignItems: "center", justifyContent: "center" },
  noMediaText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12 },
  tileLabel: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11, textAlign: "right", paddingHorizontal: 10, paddingVertical: 8 },
  controls: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 14 },
  control: { minWidth: 92, borderRadius: 12, borderWidth: 1, alignItems: "center", paddingHorizontal: 9, paddingVertical: 8 },
  controlIcon: { fontSize: 18 },
  controlLabel: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 10, textAlign: "center", marginTop: 3 },
});