"""Transcribes the clips of a recitation-eval manifest with a Whisper model, to compare another
recognizer with Tilawi: run.ts --transcripts <out> feeds these to the app's matcher.

usage: python transcribe-whisper.py <manifest.json> <out.json> [model, default FaisaI/tadabur-Whisper-Small]

Needs torch and transformers. Each clip is 24 kHz mono PCM16LE; Whisper takes 16 kHz.
"""
import json
import pathlib
import sys

import numpy as np
import torch
from transformers import WhisperForConditionalGeneration, WhisperProcessor

manifest_path, out_path = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
name = sys.argv[3] if len(sys.argv) > 3 else "FaisaI/tadabur-Whisper-Small"
processor = WhisperProcessor.from_pretrained(name)
model = WhisperForConditionalGeneration.from_pretrained(name).eval()
clips = json.loads(manifest_path.read_text(encoding="utf-8"))
done = json.loads(out_path.read_text(encoding="utf-8")) if out_path.exists() else {}
for index, clip in enumerate(clips):
    if clip["id"] in done:
        continue
    pcm = np.frombuffer((manifest_path.parent / clip["pcm"]).read_bytes(), dtype=np.int16).astype(np.float32) / 32768
    # 24 kHz -> 16 kHz
    audio = np.interp(np.arange(0, len(pcm), 1.5), np.arange(len(pcm)), pcm).astype(np.float32) if len(pcm) else pcm
    texts = []
    for start in range(0, max(len(audio), 1), 30 * 16000):  # Whisper hears 30 s at a time
        features = processor(audio[start:start + 30 * 16000], sampling_rate=16000, return_tensors="pt").input_features
        with torch.no_grad():
            ids = model.generate(features, language="ar", task="transcribe", max_new_tokens=220)
        texts.append(processor.batch_decode(ids, skip_special_tokens=True)[0].strip())
    done[clip["id"]] = " ".join(text for text in texts if text)
    if (index + 1) % 25 == 0:
        out_path.write_text(json.dumps(done, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"{index + 1}/{len(clips)}", flush=True)
out_path.write_text(json.dumps(done, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"{len(done)} transcripts -> {out_path}")
