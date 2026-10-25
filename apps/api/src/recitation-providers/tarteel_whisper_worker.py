#!/usr/bin/env python3
"""Private stdio worker for Tabyan's development-only Tarteel Whisper trial."""

from __future__ import annotations

import base64
import io
import json
import os
import resource
import sys
import time
import traceback
import wave
from pathlib import Path
from typing import Any

MODEL_REPO = "kaylazima/quranic-model"
MODEL_REVISION = "9fee6e6bca1099abef1c280e79be43a8f74d78b9"
MODEL_SUBDIR = "whisper-quran-ct2"
SOURCE_MODEL = "tarteel-ai/whisper-base-ar-quran"
MAX_AUDIO_BYTES = 24_000 * 2 * 30


def emit(message: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(message, ensure_ascii=False, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def load_model():
    from faster_whisper import WhisperModel
    from huggingface_hub import snapshot_download

    started = time.perf_counter()
    explicit_path = os.environ.get("TABYAN_TARTEEL_MODEL_PATH")
    if explicit_path:
        model_path = Path(explicit_path).resolve()
    else:
        snapshot = snapshot_download(
            repo_id=MODEL_REPO,
            revision=MODEL_REVISION,
            allow_patterns=[f"{MODEL_SUBDIR}/*"],
            # Cache-only: no model downloads and no paid fallback.
            local_files_only=True,
        )
        model_path = Path(snapshot) / MODEL_SUBDIR
    for name in ("model.bin", "config.json", "vocabulary.json"):
        if not (model_path / name).is_file() or (model_path / name).stat().st_size == 0:
            raise RuntimeError(f"Converted model is missing {name}")
    cpu_threads = max(1, min(4, os.cpu_count() or 1))
    model = WhisperModel(
        str(model_path),
        device="cpu",
        compute_type="int8",
        cpu_threads=cpu_threads,
        num_workers=1,
        local_files_only=True,
    )
    model_size_bytes = sum(path.stat().st_size for path in model_path.iterdir() if path.is_file())
    return (
        model,
        round((time.perf_counter() - started) * 1000),
        model_size_bytes,
        cpu_threads,
        resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
    )


def decode_pcm(raw: bytes, sample_rate_hz: int):
    import av
    import numpy as np

    # faster-whisper's helper passes metadata_errors to av.open, removed in PyAV 19.
    wav_buffer = io.BytesIO()
    with wave.open(wav_buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate_hz)
        wav_file.writeframes(raw)
    wav_buffer.seek(0)
    with av.open(wav_buffer) as container:
        resampler = av.AudioResampler(format="s16", layout="mono", rate=16_000)
        frames = []
        for frame in container.decode(audio=0):
            frames.extend(resampler.resample(frame))
        frames.extend(resampler.resample(None))
    if not frames:
        raise ValueError("PCM audio could not be decoded")
    samples = np.concatenate([frame.to_ndarray().reshape(-1) for frame in frames])
    return samples.astype(np.float32) / 32768.0


def transcribe(model, request: dict[str, Any]) -> dict[str, Any]:
    request_id = str(request.get("id", ""))
    sample_rate_hz = request.get("sampleRateHz")
    if sample_rate_hz != 24_000:
        raise ValueError("sampleRateHz must be 24000")
    raw = base64.b64decode(str(request.get("audioBase64", "")), validate=True)
    if not raw or len(raw) % 2 != 0 or len(raw) > MAX_AUDIO_BYTES:
        raise ValueError("PCM audio is empty, malformed, or longer than 30 seconds")

    audio = decode_pcm(raw, sample_rate_hz)
    started = time.perf_counter()
    cpu_started = time.process_time()
    segments, _info = model.transcribe(
        audio,
        language="ar",
        task="transcribe",
        beam_size=5,
        temperature=0.0,
        condition_on_previous_text=False,
        vad_filter=False,
        without_timestamps=True,
        word_timestamps=True,
        max_new_tokens=256,
    )
    decoded_segments = list(segments)
    text = " ".join(segment.text.strip() for segment in decoded_segments).strip()
    words = [
        {"word": word.word.strip(), "start": word.start, "end": word.end}
        for segment in decoded_segments for word in (segment.words or [])
    ]
    inference_ms = round((time.perf_counter() - started) * 1000)
    process_cpu_ms = round((time.process_time() - cpu_started) * 1000)
    return {
        "type": "result",
        "id": request_id,
        "text": text,
        "inferenceMs": inference_ms,
        "audioMs": round(len(raw) / (sample_rate_hz * 2) * 1000),
        "processCpuMs": process_cpu_ms,
        "peakRssKb": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
        "words": words,
    }


def main() -> int:
    try:
        model, load_ms, model_size_bytes, cpu_threads, peak_rss_kb = load_model()
        emit({
            "type": "ready",
            "model": SOURCE_MODEL,
            "revision": MODEL_REVISION,
            "loadMs": load_ms,
            "modelSizeBytes": model_size_bytes,
            "cpuThreads": cpu_threads,
            "peakRssKb": peak_rss_kb,
        })
    except Exception as error:  # Report a machine-readable startup failure to Node.
        print(f"Tarteel model startup failed: {error}", file=sys.stderr, flush=True)
        traceback.print_exc(file=sys.stderr)
        emit({"type": "fatal", "message": "Tarteel Whisper model could not be loaded"})
        return 1

    for line in sys.stdin:
        request: Any = {}
        try:
            request = json.loads(line)
            if not isinstance(request, dict) or request.get("type") != "transcribe":
                raise ValueError("Unsupported worker request")
            emit(transcribe(model, request))
        except Exception as error:
            request_id = ""
            try:
                request_id = str(request.get("id", ""))  # type: ignore[possibly-undefined]
            except Exception:
                pass
            print(f"Tarteel transcription failed: {error}", file=sys.stderr, flush=True)
            emit({"type": "result", "id": request_id, "error": "Tarteel transcription failed"})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())