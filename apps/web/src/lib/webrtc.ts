import { useCallback, useEffect, useRef, useState } from "react";

/* عميل مكالمة الحلقة — WebRTC حقيقي (mesh) عبر خادم إشارة WebSocket الخاص بالمنصة.
   - الطالب والمعلم: كاميرا + مايك حقيقيان.
   - المشرف (observer): استقبال فقط (recvonly) — يظهر كمشارك بلا بث.
   - مغادرة أي طرف لا تُنهي الغرفة لبقية المشاركين. */

export type CallPeer = {
  peerId: string;
  name: string;
  role: string;
  stream: MediaStream | null;
  recordingConsent: boolean;
};

export type CallStatus = "idle" | "connecting" | "connected" | "failed";

type SignalData =
  | { desc?: RTCSessionDescriptionInit }
  | { candidate?: RTCIceCandidateInit | null };

function wsUrl(): string {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${proto}://${location.host}${base}/api/ws/session-call`;
}

export function useSessionCall(opts: { sessionId: string; displayName: string; observer?: boolean; enabled?: boolean }) {
  const { sessionId, observer = false, enabled = true } = opts;
  const [status, setStatus] = useState<CallStatus>("idle");
  const [error, setError] = useState("");
  const [peers, setPeers] = useState<CallPeer[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const selfIdRef = useRef("");
  const pcsRef = useRef(new Map<string, RTCPeerConnection>());
  const streamsRef = useRef(new Map<string, MediaStream>());
  const localRef = useRef<MediaStream | null>(null);
  const makingOffer = useRef(new Map<string, boolean>());
  const ignoreOffer = useRef(new Map<string, boolean>());
  /* حالة إشارة لكل نظير: تسلسل معالجة SDP + طابور ICE حتى يُضبط الوصف البعيد —
     بلاها يصل candidate قبل setRemoteDescription فيُسقَط ويتقطع الاتصال */
  const sigRef = useRef(new Map<string, { chain: Promise<void>; remoteSet: boolean; candidates: (RTCIceCandidateInit | null)[] }>());

  const teardown = useCallback(() => {
    pcsRef.current.forEach((pc) => pc.close());
    pcsRef.current.clear();
    streamsRef.current.clear();
    makingOffer.current.clear();
    ignoreOffer.current.clear();
    sigRef.current.clear();
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    setLocalStream(null);
    setPeers([]);
    if (wsRef.current) {
      try { wsRef.current.send(JSON.stringify({ t: "leave" })); } catch { /* closed */ }
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !sessionId) return;
    let cancelled = false;
    setStatus("connecting");
    setError("");

    const token = localStorage.getItem("tabyan_token") ?? "";

    const start = async () => {
      // 1) الوسائط المحلية — المراقب لا يطلب كاميرا/مايك إطلاقاً
      if (!observer) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: { echoCancellation: true, noiseSuppression: true },
          });
          if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
          localRef.current = stream;
          setLocalStream(stream);
        } catch {
          if (!cancelled) { setStatus("failed"); setError("تعذر الوصول إلى الكاميرا أو الميكروفون — امنح الإذن ثم أعد المحاولة"); }
          return;
        }
      }

      // 2) قناة الإشارة
      const ws = new WebSocket(wsUrl());
      wsRef.current = ws;

      ws.onopen = () => ws.send(JSON.stringify({ t: "auth", token }));
      ws.onerror = () => { if (!cancelled) { setStatus("failed"); setError("تعذر الاتصال بخادم الاتصال"); } };
      ws.onclose = () => {
        if (!cancelled) setStatus((st) => (st === "failed" ? st : "failed"));
        if (!cancelled) setError((e) => e || "انقطع الاتصال بالحلقة");
      };

      const sendSignal = (to: string, data: SignalData) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: "signal", to, data }));
      };

      const removePeer = (peerId: string) => {
        pcsRef.current.get(peerId)?.close();
        pcsRef.current.delete(peerId);
        streamsRef.current.delete(peerId);
        makingOffer.current.delete(peerId);
        ignoreOffer.current.delete(peerId);
        sigRef.current.delete(peerId);
        setPeers((ps) => ps.filter((p) => p.peerId !== peerId));
      };

      const ensurePc = (peerId: string, name: string, role: string): RTCPeerConnection => {
        const existing = pcsRef.current.get(peerId);
        if (existing) return existing;

        /* STUN + مرحّل TURN عام (OpenRelay) كاحتياط لشبكات NAT المتماثلة —
           بلا TURN تفشل المكالمة على كثير من شبكات الجوال. للإنتاج الواسع
           يُنصح لاحقاً بخادم TURN خاص باعتماديات. */
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
            { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
            { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
          ],
        });
        pcsRef.current.set(peerId, pc);
        makingOffer.current.set(peerId, false);
        ignoreOffer.current.set(peerId, false);
        const sig = { chain: Promise.resolve(), remoteSet: false, candidates: [] as (RTCIceCandidateInit | null)[] };
        sigRef.current.set(peerId, sig);
        const polite = selfIdRef.current < peerId;

        setPeers((ps) => (ps.some((p) => p.peerId === peerId) ? ps : [...ps, {
          peerId, name, role, stream: null, recordingConsent: false,
        }]));

        if (observer) {
          // مراقب: استقبال الصوت والصورة فقط
          pc.addTransceiver("audio", { direction: "recvonly" });
          pc.addTransceiver("video", { direction: "recvonly" });
        } else if (localRef.current) {
          localRef.current.getTracks().forEach((t) => pc.addTrack(t, localRef.current!));
        }

        pc.onnegotiationneeded = async () => {
          try {
            makingOffer.current.set(peerId, true);
            await pc.setLocalDescription();
            if (pc.localDescription) sendSignal(peerId, { desc: pc.localDescription.toJSON() });
          } catch { /* negotiation retry on next event */ } finally {
            makingOffer.current.set(peerId, false);
          }
        };
        pc.onicecandidate = (e) => sendSignal(peerId, { candidate: e.candidate ? e.candidate.toJSON() : null });
        pc.ontrack = (e) => {
          let stream = streamsRef.current.get(peerId);
          if (!stream) { stream = new MediaStream(); streamsRef.current.set(peerId, stream); }
          stream.addTrack(e.track);
          const snap = stream;
          setPeers((ps) => ps.map((p) => (p.peerId === peerId ? { ...p, stream: snap } : p)));
          e.track.onended = () => {
            snap.removeTrack(e.track);
            setPeers((ps) => ps.map((p) => (p.peerId === peerId ? { ...p, stream: snap } : p)));
          };
        };
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "failed" || pc.connectionState === "closed") removePeer(peerId);
        };

        // نمط «التفاوض المثالي» + تسلسل الإشارات وطابور ICE لكل نظير
        (pc as unknown as { handleSignal: (data: SignalData) => void }).handleSignal = (data) => {
          sig.chain = sig.chain.then(async () => {
            if ("desc" in data && data.desc) {
              const desc = data.desc;
              const offerCollision =
                desc.type === "offer" &&
                (makingOffer.current.get(peerId) || pc.signalingState !== "stable");
              ignoreOffer.current.set(peerId, !polite && offerCollision);
              if (ignoreOffer.current.get(peerId)) return;
              await pc.setRemoteDescription(desc);
              sig.remoteSet = true;
              for (const c of sig.candidates) { try { await pc.addIceCandidate(c); } catch { /* stale candidate */ } }
              sig.candidates = [];
              if (desc.type === "offer") {
                await pc.setLocalDescription();
                if (pc.localDescription) sendSignal(peerId, { desc: pc.localDescription.toJSON() });
              }
            } else if ("candidate" in data) {
              if (!sig.remoteSet) { sig.candidates.push(data.candidate ?? null); return; }
              try {
                await pc.addIceCandidate(data.candidate ?? null);
              } catch (err) {
                if (!ignoreOffer.current.get(peerId)) throw err;
              }
            }
          }).catch(() => { /* transient glare — peer retries */ });
        };
        return pc;
      };

      ws.onmessage = (ev) => {
        if (cancelled) return;
        let msg: Record<string, unknown>;
        try { msg = JSON.parse(String(ev.data)); } catch { return; }

        switch (msg.t) {
          case "hello":
            selfIdRef.current = String(msg.selfId);
            ws.send(JSON.stringify({ t: "join", sessionId }));
            break;
          case "joined": {
            setStatus("connected");
            const list = (msg.peers as { peerId: string; name: string; role: string; recordingConsent?: boolean }[]) ?? [];
            list.forEach((p) => {
              ensurePc(p.peerId, p.name, p.role);
              setPeers((peers) => peers.map((peer) => peer.peerId === p.peerId
                ? { ...peer, recordingConsent: p.recordingConsent === true }
                : peer));
            });
            break;
          }
          case "peer-joined": {
            const p = msg.peer as { peerId: string; name: string; role: string };
            ensurePc(p.peerId, p.name, p.role);
            break;
          }
          case "peer-left":
            removePeer(String(msg.peerId));
            break;
          case "signal": {
            const from = String(msg.from);
            const pc = pcsRef.current.get(from);
            if (pc) {
              const handler = (pc as unknown as { handleSignal?: (d: SignalData) => Promise<void> }).handleSignal;
              void handler?.(msg.data as SignalData);
            }
            break;
          }
          case "recording-consent":
            setPeers((peers) => peers.map((peer) => peer.peerId === String(msg.peerId)
              ? { ...peer, recordingConsent: msg.accepted === true }
              : peer));
            break;
          case "error":
            setStatus("failed");
            setError(String(msg.message ?? "حدث خطأ في الاتصال"));
            break;
        }
      };
    };

    void start();
    return () => {
      cancelled = true;
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, observer, enabled]);

  const toggleMic = useCallback(() => {
    const stream = localRef.current;
    if (!stream) return;
    const next = !micOn;
    stream.getAudioTracks().forEach((t) => { t.enabled = next; });
    setMicOn(next);
  }, [micOn]);

  const toggleCam = useCallback(() => {
    const stream = localRef.current;
    if (!stream) return;
    const next = !camOn;
    stream.getVideoTracks().forEach((t) => { t.enabled = next; });
    setCamOn(next);
  }, [camOn]);

  const setRecordingConsent = useCallback((accepted: boolean) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ t: "recording-consent", accepted }));
    }
  }, []);

  return {
    status, error, peers, localStream, micOn, camOn,
    toggleMic, toggleCam, setRecordingConsent, leave: teardown,
  };
}
