"""Lossless runtime derivatives from the single approved SVG geometry.

Uses only installed ImageMagick. Supersamples VECTOR geometry before downsampling;
never enlarges a raster. Wide Native framing preserves Splash/Welcome layouts.
"""
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MASTER = ROOT / "assets/branding/tabyan-logo.svg"
WEB = ROOT / "artifacts/tabyan/public"
NATIVE = ROOT / "artifacts/mobile/assets/images"
BURGUNDY = "#800020"
GOLD = "#D4AF37"


def export():
    svg = MASTER.read_text()
    variants = {BURGUNDY: svg, GOLD: svg.replace(BURGUNDY, GOLD)}
    (WEB / "logo-light.svg").write_text(variants[BURGUNDY])
    (WEB / "logo-dark.svg").write_text(variants[GOLD])
    with tempfile.TemporaryDirectory(prefix="tabyan-brand-") as directory:
        tmp = Path(directory)
        for color, text in variants.items():
            key = "light" if color == BURGUNDY else "gold"
            square = tmp / f"{key}.svg"
            square.write_text(text)
            png = tmp / f"{key}.png"
            subprocess.run([
                "magick", "-background", "none", "-density", "288", str(square),
                "-resize", "1024x1024", "-depth", "8",
                "-define", "png:compression-level=9", f"PNG32:{png}",
            ], check=True)
            web_names = ["logo-light.png", "logo.png", "logo-transparent.png", "logo-official.png"] if key == "light" else ["logo-dark.png", "logo-splash.png"]
            native_names = ["logo-light.png"] if key == "light" else ["logo-dark.png", "logo-gold.png"]
            for name in web_names:
                (WEB / name).write_bytes(png.read_bytes())
            for name in native_names:
                (NATIVE / name).write_bytes(png.read_bytes())
            # Translate the square master into the former 1196x639 frame.
            # No deformation, crop, backplate or independent tracing.
            body = text.split("<title>")[1].split("</title>", 1)[1].rsplit("</svg>", 1)[0]
            wide = tmp / f"{key}-wide.svg"
            wide.write_text(
                '<svg xmlns="http://www.w3.org/2000/svg" width="1196" height="639" '
                'viewBox="0 0 1196 639" preserveAspectRatio="xMidYMid meet">'
                f'<g transform="translate(236 -52)">{body}</g></svg>'
            )
            names = ["logo-welcome-light.png"] if key == "light" else ["logo-splash.png"]
            for name in names:
                subprocess.run([
                    "magick", "-background", "none", "-density", "288", str(wide),
                    "-resize", "1196x639", "-depth", "8",
                    "-define", "png:compression-level=9", f"PNG32:{NATIVE / name}",
                ], check=True)
    print("Web SVGs and lossless 1024² / 1196x639 Native PNGs exported from one master.")


if __name__ == "__main__":
    export()
