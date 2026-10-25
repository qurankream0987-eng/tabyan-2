#!/usr/bin/env python3
"""Prepare text-free Tabyan ornament copies without redrawing the source art.

Uses only Python's standard library. Original references and dimensions are kept.
The source PNGs are RGB, 8-bit, non-interlaced; reject other formats explicitly.
"""
from pathlib import Path
import struct
import zlib

ASSETS = Path(__file__).resolve().parents[1] / "src/assets/mushaf"
IVORY = (253, 249, 240)
GOLD = (160, 138, 76)
GREEN = (112, 130, 102)
BURGUNDY = (110, 34, 51)


def read_rgb(path):
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("Not a PNG")
    offset, compressed, header = 8, bytearray(), None
    while offset < len(data):
        length = struct.unpack(">I", data[offset:offset + 4])[0]
        kind = data[offset + 4:offset + 8]
        payload = data[offset + 8:offset + 8 + length]
        if kind == b"IHDR":
            header = struct.unpack(">IIBBBBB", payload)
        elif kind == b"IDAT":
            compressed.extend(payload)
        offset += length + 12
    w, h, depth, color, compression, filtering, interlace = header
    if (depth, color, compression, filtering, interlace) != (8, 2, 0, 0, 0):
        raise ValueError(f"Unsupported PNG format: {header}")
    raw = zlib.decompress(compressed)
    stride = w * 3
    pixels, previous = bytearray(), bytearray(stride)
    for y in range(h):
        start = y * (stride + 1)
        mode = raw[start]
        row = bytearray(raw[start + 1:start + 1 + stride])
        for x in range(stride):
            a = row[x - 3] if x >= 3 else 0
            b = previous[x]
            c = previous[x - 3] if x >= 3 else 0
            if mode == 1:
                predictor = a
            elif mode == 2:
                predictor = b
            elif mode == 3:
                predictor = (a + b) // 2
            elif mode == 4:
                p = a + b - c
                distances = (abs(p - a), abs(p - b), abs(p - c))
                predictor = (a, b, c)[distances.index(min(distances))]
            elif mode == 0:
                predictor = 0
            else:
                raise ValueError(f"Unsupported filter {mode}")
            row[x] = (row[x] + predictor) & 255
        pixels.extend(row)
        previous = row
    return w, h, pixels


def write_rgb(path, w, h, pixels):
    def chunk(kind, payload):
        return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload))
    scanlines = b"".join(b"\0" + pixels[y * w * 3:(y + 1) * w * 3] for y in range(h))
    path.write_bytes(b"\x89PNG\r\n\x1a\n"
                     + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
                     + chunk(b"IDAT", zlib.compress(scanlines, 9)) + chunk(b"IEND", b""))


def prepare(stem, clear_regions):
    w, h, pixels = read_rgb(ASSETS / f"{stem}-reference.png")
    for y in range(h):
        for x in range(w):
            i = (y * w + x) * 3
            r, g, b = pixels[i:i + 3]
            # These rectangles are inside blank cartouche/medallion interiors,
            # never on the ornamental outline. Remove only baked-in fixture text.
            if any(x0 <= x <= x1 and y0 <= y <= y1 for x0, y0, x1, y1 in clear_regions):
                rgb = IVORY
            elif min(r, g, b) >= 224:
                rgb = (r, g, b)
            else:
                dark = (r + g + b) / 3 < 160
                green = g >= r and g > b + 8
                target = GOLD if dark else GREEN if green else BURGUNDY
                density = min(1, max(0, (240 - min(r, g, b)) / 170))
                rgb = tuple(round(IVORY[j] + density * (target[j] - IVORY[j])) for j in range(3))
            pixels[i:i + 3] = bytes(rgb)
    output = ASSETS / f"{stem}-tabyan.png"
    write_rgb(output, w, h, pixels)
    print(f"{output.name}: {w}x{h}; source unchanged")


prepare("surah-header", [(330, 25, 625, 131), (96, 43, 148, 117), (784, 43, 836, 117)])
prepare("surah-footer", [(449, 27, 484, 61)])