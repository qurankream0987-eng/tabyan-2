import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useSessionCall, type CallPeer } from "@/lib/webrtc";
import SessionControlButton from "@/components/SessionControlButton";
import Icon from "@/components/Icon";
import { InitialsAvatar } from "@/components/CircularUserCard";

type RecordingState = "idle" | "recording" | "saving" | "saved" | "failed";

export type SessionCallHandle = {
  stopRecording: () => Promise<void>;
};

function VideoTile({ stream, name, muted, mirror, label }: {
  stream: MediaStream | null; name: string; muted?: boolean; mirror?: boolean; label?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  const hasVideo = !!stream && stream.getVideoTracks().some((t) => t.enabled && t.readyState === "live");

  return (
    <div className="relative rounded-2xl bg-night-surface border border-white/10 overflow-hidden min-h-40 flex items-center justify-center">
      <video ref={ref} autoPlay playsInline muted={muted}
        className={`absolute inset-0 w-full h-full object-cover ${mirror ? "-scale-x-100" : ""} ${hasVideo ? "" : "hidden"}`} />
      {!hasVideo && <div className="text-center py-10"><div className="flex justify-center"><InitialsAvatar name={name} size={72} /></div><div className="font-readex text-white/80 text-sm mt-2">{name}</div></div>}
      <div className="absolute bottom-2 right-2 rounded-lg bg-black/60 border border-white/15 px-2 py-0.5"><span className="text-white/80 text-[11px] font-readex">{label ?? name}</span></div>
    </div>
  );
}

const MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

type Composite = { stream: MediaStream; cleanup: () => void };

function composeSessionStream(local: MediaStream, remote: MediaStream): Composite {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("تعذر تجهيز لوحة تسجيل الحلقة");

  const makeVideo = (stream: MediaStream) => {
    const video = document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    void video.play().catch(() => {});
    return video;
  };
  const localVideo = makeVideo(local);
  const remoteVideo = makeVideo(remote);
  let animation = 0;
  const drawTile = (video: HTMLVideoElement, x: number, title: string) => {
    ctx.fillStyle = "#17131a";
    ctx.fillRect(x, 0, 640, 720);
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
      const scale = Math.max(640 / video.videoWidth, 720 / video.videoHeight);
      const width = video.videoWidth * scale;
      const height = video.videoHeight * scale;
      ctx.drawImage(video, x + (640 - width) / 2, (720 - height) / 2, width, height);
    }
    ctx.fillStyle = "rgba(0,0,0,.60)";
    ctx.fillRect(x + 18, 670, 210, 34);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(title, x + 32, 693);
  };
  const render = () => {
    drawTile(localVideo, 0, "المعلم");
    drawTile(remoteVideo, 640, "الطالب");
    animation = requestAnimationFrame(render);
  };
  render();

  const videoTracks = canvas.captureStream(24).getVideoTracks();
  const output = new MediaStream(videoTracks);
  let audioContext: AudioContext | null = null;
  try {
    const audioTracks = [...local.getAudioTracks(), ...remote.getAudioTracks()]
      .filter((track) => track.readyState === "live" && track.enabled);
    if (audioTracks.length) {
      audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();
      [local, remote].forEach((sourceStream) => {
        if (!sourceStream.getAudioTracks().some((track) => track.readyState === "live" && track.enabled)) return;
        audioContext?.createMediaStreamSource(sourceStream).connect(destination);
      });
      destination.stream.getAudioTracks().forEach((track) => output.addTrack(track));
    }
  } catch {
    // A video recording without a mix is less useful, but still explicit and
    // recoverable; the server's structural validation remains authoritative.
  }

  return {
    stream: output,
    cleanup: () => {
      cancelAnimationFrame(animation);
      output.getTracks().forEach((track) => track.stop());
      localVideo.srcObject = null;
      remoteVideo.srcObject = null;
      void audioContext?.close().catch(() => {});
    },
  };
}

async function isPlayableRecording(blob: Blob): Promise<boolean> {
  if (blob.size === 0) return false;
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(ok);
    };
    const timeout = window.setTimeout(() => finish(false), 10_000);
    video.preload = "auto";
    video.onloadedmetadata = () => finish(video.videoWidth > 0 && video.videoHeight > 0 && (video.duration > 0 || !Number.isFinite(video.duration)));
    video.onerror = () => finish(false);
    video.src = url;
  });
}

const SessionCall = forwardRef<SessionCallHandle, {
  sessionId: string;
  displayName: string;
  observer?: boolean;
  recordingEnabled?: boolean;
  isTeacher?: boolean;
  onRecordingReady?: (file: Blob, durationSeconds: number) => Promise<void>;
  onLeave: () => void;
}>(function SessionCall({
  sessionId, displayName, observer = false, recordingEnabled = false, isTeacher = false, onRecordingReady, onLeave,
}, ref) {
  const {
    status, error, peers, localStream, micOn, camOn, toggleMic, toggleCam, setRecordingConsent, leave,
  } = useSessionCall({ sessionId, displayName, observer });
  const [elapsed, setElapsed] = useState(0);
  const [consented, setConsented] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingError, setRecordingError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const compositeRef = useRef<Composite | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef(0);
  const stopPromiseRef = useRef<Promise<void> | null>(null);
  const stopResolveRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (status !== "connected") return;
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (!recordingEnabled || status !== "connected") return;
    setRecordingConsent(consented);
  }, [consented, recordingEnabled, setRecordingConsent, status]);

  const participants = peers.filter((peer) => peer.role !== "admin");
  const allParticipantsConsented = participants.length > 0
    && participants.every((peer) => peer.recordingConsent && !!peer.stream);
  const mayRecord = recordingEnabled && isTeacher && consented && !!localStream && allParticipantsConsented;

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    if (stopPromiseRef.current) return stopPromiseRef.current;
    stopPromiseRef.current = new Promise<void>((resolve) => { stopResolveRef.current = resolve; });
    recorder.requestData();
    recorder.stop();
    return stopPromiseRef.current;
  }, []);

  useImperativeHandle(ref, () => ({ stopRecording }), [stopRecording]);

  const startRecording = useCallback(() => {
    if (!localStream || !participants[0]?.stream || recorderRef.current?.state === "recording") return;
    let composite: Composite;
    try {
      composite = composeSessionStream(localStream, participants[0].stream);
      const mimeType = MIME_CANDIDATES.find((candidate) => MediaRecorder.isTypeSupported(candidate));
      const recorder = new MediaRecorder(composite.stream, mimeType ? { mimeType } : undefined);
      compositeRef.current = composite;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        setRecordingState("saving");
        const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        compositeRef.current?.cleanup();
        compositeRef.current = null;
        recorderRef.current = null;
        try {
          if (!(await isPlayableRecording(blob))) throw new Error("الملف المسجل غير صالح أو لم يكتمل");
          await onRecordingReady?.(blob, durationSeconds);
          setRecordingState("saved");
        } catch (cause) {
          setRecordingState("failed");
          setRecordingError(cause instanceof Error ? cause.message : "تعذر حفظ تسجيل الحلقة");
        } finally {
          stopResolveRef.current?.();
          stopResolveRef.current = null;
          stopPromiseRef.current = null;
        }
      };
      startedAtRef.current = Date.now();
      recorder.start(1_000);
      setRecordingError("");
      setRecordingState("recording");
    } catch (cause) {
      compositeRef.current?.cleanup();
      compositeRef.current = null;
      setRecordingState("failed");
      setRecordingError(cause instanceof Error ? cause.message : "هذا المتصفح لا يدعم تسجيل الحلقة");
    }
  }, [localStream, onRecordingReady, participants]);

  useEffect(() => {
    if (mayRecord) startRecording();
    else if (recorderRef.current?.state === "recording") void stopRecording();
  }, [mayRecord, startRecording, stopRecording]);

  useEffect(() => () => {
    compositeRef.current?.cleanup();
  }, []);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const exit = () => { void stopRecording(); leave(); onLeave(); };

  if (status === "failed") {
    return <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white font-readex"><div className="text-red-400"><Icon name="x" size={40} /></div><p className="text-sm">{error || "تعذر الاتصال بالحلقة"}</p><button onClick={exit} className="text-gold underline text-sm">خروج</button></div>;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div className="flex items-center justify-between text-white/90 mb-3">
        <span className="font-readex text-xs text-white/60 inline-flex items-center gap-1.5">{status === "connected" ? <><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />متصل — بث مباشر</> : <><span className="w-2 h-2 rounded-full bg-gold animate-pulse inline-block" />جارٍ الاتصال بالحلقة…</>}</span>
        <span className="font-readex text-sm bg-white/10 rounded-full px-3 py-1" dir="ltr">{mm}:{ss}</span>
      </div>

      {recordingEnabled && !observer && (
        <div className="mb-3 rounded-xl border border-gold/35 bg-gold/10 px-3 py-2 font-readex text-[11px] text-white/85">
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} className="mt-0.5 accent-gold" />
            <span>أوافق بوضوح على تسجيل هذه الحلقة وحفظها بشكل خاص لمدة ستة أشهر. لا يبدأ التسجيل قبل موافقة الطرفين.</span>
          </label>
          {isTeacher && consented && !allParticipantsConsented && <p className="mt-1 text-gold">بانتظار موافقة الطرف الآخر واتصال وسائطه…</p>}
        </div>
      )}
      {recordingState === "recording" && <div className="mb-3 rounded-xl bg-red-600/90 px-3 py-2 text-center font-readex text-xs text-white"><span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse ml-1.5" />يتم تسجيل الحلقة الآن</div>}
      {recordingState === "saving" && <div className="mb-3 rounded-xl bg-white/10 px-3 py-2 text-center font-readex text-xs text-white/80">جارٍ التحقق من التسجيل ورفعه بشكل آمن…</div>}
      {recordingState === "failed" && <div className="mb-3 rounded-xl bg-red-500/15 border border-red-400/30 px-3 py-2 text-center font-readex text-xs text-red-100">لم يُحفظ التسجيل: {recordingError}. يمكن إكمال الحلقة وتقييم الطالب كالمعتاد.</div>}

      <div className={`flex-1 grid gap-3 min-h-0 ${peers.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
        {peers.length === 0 && <div className="rounded-2xl bg-night-surface border border-white/10 flex flex-col items-center justify-center gap-2 text-white/60"><Icon name="users" size={36} /><p className="font-readex text-sm">بانتظار انضمام الطرف الآخر…</p></div>}
        {peers.map((peer: CallPeer) => <VideoTile key={peer.peerId} stream={peer.stream} name={peer.name} label={peer.role === "admin" ? `${peer.name} — مراقبة` : peer.name} />)}
      </div>

      {!observer && localStream && <div className="absolute bottom-24 left-4 w-28 h-20 z-10"><VideoTile stream={localStream} name="أنت" muted mirror label="أنت" /></div>}
      <div className="flex items-center justify-center gap-4 pt-4 pb-2">
        {!observer && <><SessionControlButton title={micOn ? "كتم الصوت" : "تشغيل الصوت"} variant={micOn ? "active" : "default"} onClick={toggleMic}><Icon name={micOn ? "mic" : "mic-off"} size={20} /></SessionControlButton><SessionControlButton title={camOn ? "إيقاف الكاميرا" : "تشغيل الكاميرا"} variant={camOn ? "active" : "default"} onClick={toggleCam}><Icon name={camOn ? "video" : "video-off"} size={20} /></SessionControlButton></>}
        <SessionControlButton title="المصحف" onClick={() => window.open("https://quran.com", "_blank")}><Icon name="quran" size={20} /></SessionControlButton>
        <SessionControlButton title="مغادرة" variant="danger" onClick={exit}><Icon name="phone" size={20} /></SessionControlButton>
      </div>
      {observer && <p className="text-center text-white/50 text-[11px] font-readex pb-2">وضع المراقبة — الميكروفون والكاميرا مغلقان، وتظهر للمشاركين كمراقب</p>}
    </div>
  );
});

export default SessionCall;