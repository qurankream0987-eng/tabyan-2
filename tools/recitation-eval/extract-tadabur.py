"""Extracts clips of the Tadabur dataset (FaisaI/tadabur) for tools/recitation-eval/run.ts.

usage: python extract-tadabur.py <dir with the dataset's parquet files> <output dir>

Writes each ayah as 24 kHz mono PCM16LE (needs ffmpeg) and a manifest.json. Every clip is a
whole ayah read by a reciter, so all are labelled "correct": the run measures false stops only.
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
    for batch in parquet.iter_batches(batch_size=16):
        for row in batch.to_pylist():
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
                "surahName": "",
                # The dataset's surah number is sometimes off by one; the text decides (see run.ts).
                "surah": row["surah_id"],
                "ayaText": row["text_ar_simple"],
                "label": "correct",
                "country": f"reciter {row['reciter_id']}",
                "seconds": round(row["ayah_duration_s"] or 0, 2),
                "pcm": f"pcm/{clip_id}.pcm",
            })
(target / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"{len(manifest)} clips -> {target}")
