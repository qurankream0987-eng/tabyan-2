"""Restore the existing mark as curves, using only local ImageMagick and stdlib.

The approved transparent silhouette is the reference, never modified. No font,
AI image generation, embedded raster, or independently drawn lettering is used.
"""
import math
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets/branding/reference/tabyan-logo-silhouette.png"
DEST = ROOT / "assets/branding/tabyan-logo.svg"


def add(a, b):
    return (a[0] + b[0], a[1] + b[1])


def sub(a, b):
    return (a[0] - b[0], a[1] - b[1])


def mul(a, s):
    return (a[0] * s, a[1] * s)


def dot(a, b):
    return a[0] * b[0] + a[1] * b[1]


def unit(a):
    return mul(a, 1 / max(1e-12, math.hypot(*a)))



def bezier(c, t):
    s = 1 - t
    return add(add(mul(c[0], s**3), mul(c[1], 3*t*s*s)),
               add(mul(c[2], 3*t*t*s), mul(c[3], t**3)))


def fit(points, left, right):
    """Least-squares cubic fitting with a one-reference-pixel error ceiling."""
    if len(points) == 2:
        length = math.dist(points[0], points[1]) / 3
        return [[points[0], add(points[0], mul(left, length)),
                 add(points[1], mul(right, length)), points[1]]]
    lengths = [0.0]
    for a, b in zip(points, points[1:]):
        lengths.append(lengths[-1] + math.dist(a, b))
    u = [v / max(1e-12, lengths[-1]) for v in lengths]
    c00 = c01 = c11 = x0 = x1 = 0.0
    for p, t in zip(points, u):
        s = 1 - t
        b0, b1, b2, b3 = s**3, 3*t*s*s, 3*t*t*s, t**3
        a0, a1 = mul(left, b1), mul(right, b2)
        residual = sub(p, add(mul(points[0], b0 + b1), mul(points[-1], b2 + b3)))
        c00 += dot(a0, a0)
        c01 += dot(a0, a1)
        c11 += dot(a1, a1)
        x0 += dot(a0, residual)
        x1 += dot(a1, residual)
    determinant = c00*c11 - c01*c01
    fallback = math.dist(points[0], points[-1]) / 3
    alpha = (x0*c11 - x1*c01) / determinant if abs(determinant) > 1e-12 else fallback
    beta = (c00*x1 - c01*x0) / determinant if abs(determinant) > 1e-12 else fallback
    if alpha <= 1e-6 or beta <= 1e-6:
        alpha = beta = fallback
    c = [points[0], add(points[0], mul(left, alpha)), add(points[-1], mul(right, beta)), points[-1]]
    split, error = max(((i, math.dist(p, bezier(c, t))) for i, (p, t) in enumerate(zip(points, u))), key=lambda v: v[1])
    if error <= 1.0:
        return [c]
    split = max(1, min(len(points) - 2, split))
    center = unit(sub(points[split - 1], points[split + 1]))
    return fit(points[:split + 1], left, center) + fit(points[split:], mul(center, -1), right)


def curve(points):
    p = points + [points[0]]
    left = unit(sub(p[min(4, len(p) - 1)], p[0]))
    right = unit(sub(p[max(0, len(p) - 5)], p[-1]))
    commands = [f"M{p[0][0]},{p[0][1]}"]
    for c in fit(p, left, right):
        commands.append("C" + " ".join(f"{x:.2f},{y:.2f}" for x, y in c[1:]))
    return "".join(commands) + "Z"


def main():
    data = subprocess.check_output([
        "magick", str(SOURCE),
        "-threshold", "50%", "-depth", "8", "-compress", "none", "pgm:-",
    ]).split()
    if data[:3] != [b"P2", b"1254", b"1254"] or data[3] != b"255":
        raise ValueError("Unexpected reference format; do not trace blindly.")
    pixels = bytearray(int(value) > 0 for value in data[4:])
    size = 1254
    if len(pixels) != size * size:
        raise ValueError("Incomplete reference.")
    edges = {}

    def add(a, b):
        edges.setdefault(a, []).append(b)

    def filled(x, y):
        return 0 <= x < size and 0 <= y < size and pixels[y * size + x]

    for y in range(size):
        for x in range(size):
            if not filled(x, y):
                continue
            if not filled(x, y - 1):
                add((x, y), (x + 1, y))
            if not filled(x + 1, y):
                add((x + 1, y), (x + 1, y + 1))
            if not filled(x, y + 1):
                add((x + 1, y + 1), (x, y + 1))
            if not filled(x - 1, y):
                add((x, y + 1), (x, y))

    contours = []
    while edges:
        start = next(iter(edges))
        current, points = start, []
        while True:
            points.append(current)
            targets = edges[current]
            current = targets.pop()
            if not targets:
                del edges[points[-1]]
            if current == start:
                break
        # Preserve even tiny islands for review, rather than discard dots.
        if len(points) >= 4:
            contours.append(points)
    paths = "".join(curve(points) for points in contours)
    # Preserve the uploaded mark's proportions, not the old bitmap's lettering.
    # Match the previous visible width/center in the existing Welcome frames.
    ink = [(x, y) for y in range(size) for x in range(size) if filled(x, y)]
    min_x, max_x = min(x for x, _ in ink), max(x for x, _ in ink) + 1
    min_y, max_y = min(y for _, y in ink), max(y for _, y in ink) + 1
    scale = 589 / (max_x - min_x)
    tx = 68 - min_x * scale
    ty = 372 - (min_y + max_y) / 2 * scale
    DEST.write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720" '
        'viewBox="0 0 720 720" preserveAspectRatio="xMidYMid meet">'
        '<title>تبيان</title>'
        f'<path fill="#800020" fill-rule="evenodd" transform="matrix({scale:.8f} 0 0 {scale:.8f} {tx:.8f} {ty:.8f})" d="{paths}"/>'
        '</svg>\n'
    )
    print(f"Restored {len(contours)} closed contours; SVG {DEST.stat().st_size} bytes.")


if __name__ == "__main__":
    main()
