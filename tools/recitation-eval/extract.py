"""Extracts the labelled clips of RetaSy/quranic_audio_dataset for tools/recitation-eval/run.ts.

usage: python extract.py <dir with the dataset's parquet files> <output dir>

Writes each labelled clip as 24 kHz mono PCM16LE (the rate the app sends; needs ffmpeg) and a
manifest.json listing them. Unlabelled clips are skipped: nobody checked how they were read.
"""
import json
import pathlib
import subprocess
import sys

import pyarrow.parquet as pq

source, target = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
(target / "pcm").mkdir(parents=True, exist_ok=True)
manifest = []
for file in sorted(source.glob("*.parquet")):
    parquet = pq.ParquetFile(file)
    for batch in parquet.iter_batches(batch_size=64):
        for row in batch.to_pylist():
            if not row["final_label"]:
                continue
            clip_id = f"{file.stem}-{len(manifest):05d}"
            pcm = target / "pcm" / f"{clip_id}.pcm"
            if not pcm.exists():
                done = subprocess.run(
                    ["ffmpeg", "-v", "error", "-y", "-i", "pipe:0", "-ac", "1", "-ar", "24000", "-f", "s16le", str(pcm)],
                    input=row["audio"]["bytes"], capture_output=True)
                if done.returncode != 0 or not pcm.exists() or pcm.stat().st_size == 0:
                    pcm.unlink(missing_ok=True)
                    continue
            manifest.append({
                "id": clip_id,
                "surahName": row["Surah"],
                "ayaText": row["Aya"],
                "label": row["final_label"],
                "golden": bool(row["golden"]),
                "judgments": row["judgments_num"],
                "country": row["reciter_country"],
                "seconds": round((row["duration_ms"] or 0) / 1000, 2),
                "pcm": f"pcm/{clip_id}.pcm",
            })
(target / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"{len(manifest)} labelled clips -> {target}")
