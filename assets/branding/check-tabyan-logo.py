"""Focused source/derivative contract checks. No network, auth or app data."""
import hashlib
import struct
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "artifacts/tabyan/public"
MOBILE = ROOT / "artifacts/mobile"
SVG = "{http://www.w3.org/2000/svg}"


def png_size(path):
    data = path.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    return struct.unpack(">II", data[16:24])


master = ET.parse(ROOT / "assets/branding/tabyan-logo.svg").getroot()
assert master.attrib["viewBox"] == "0 0 720 720"
assert master.attrib["preserveAspectRatio"] == "xMidYMid meet"
assert len(master.findall(SVG + "path")) == 1
assert not master.findall(SVG + "image")
assert not master.findall(SVG + "text")
assert not master.findall(SVG + "rect")
path = master.find(SVG + "path")
assert path.attrib["fill"] == "#800020"
assert path.attrib["fill-rule"] == "evenodd"
assert path.attrib["d"].count("Z") == 17
for name, color in [("logo-light.svg", "#800020"), ("logo-dark.svg", "#D4AF37")]:
    child = ET.parse(WEB / name).getroot().find(SVG + "path")
    assert child.attrib["d"] == path.attrib["d"]
    assert child.attrib["transform"] == path.attrib["transform"]
    assert child.attrib["fill"] == color

for name in ["logo-light.png", "logo-dark.png", "logo-gold.png"]:
    assert png_size(MOBILE / "assets/images" / name) == (1024, 1024)
for name in ["logo-splash.png", "logo-welcome-light.png"]:
    image = MOBILE / "assets/images" / name
    assert png_size(image) == (1196, 639)
    # Maximum full image canvas is 360pt: @3x requires 1080px, not just 600px.
    assert png_size(image)[0] >= 360 * 3
    alpha = subprocess.check_output(
        ["magick", str(image), "-format", "%[fx:minima.a],%[fx:maxima.a]", "info:"],
        text=True,
    )
    assert alpha.strip() == "0,1", alpha

hero = (MOBILE / "components/app/IOSWelcomeHero.tsx").read_text()
assert 'resizeMode="contain"' in hero
assert 'logo-welcome-light.png' in hero
assert 'accessibilityLabel="تبيان"' in hero
layout = (MOBILE / "lib/ios-welcome-layout.ts").read_text()
assert 'platform === "ios" ? "light"' in layout
assert "brandBasis: usableHeight * 0.4" in layout
assert "Math.min(200, width * 0.55)" in layout
for width in [375, 390, 393, 430]:
    rendered = min(200, width * 0.55)
    assert rendered * 3 <= 1196
welcome = (ROOT / "artifacts/tabyan/src/pages/GuestHome.tsx").read_text()
assert '/logo-light.svg' in welcome and '/logo-dark.svg' in welcome
assert 'object-contain' in welcome
splash = (ROOT / "artifacts/tabyan/src/components/app/SplashScreen.tsx").read_text()
assert '/logo-dark.svg' in splash

print("PASS: one real path master; matching color variants; Retina headroom; transparency; contain; labels; unchanged iOS layout/default.")
print("App icon SHA256 (audit only):", hashlib.sha256((MOBILE / "assets/images/icon.png").read_bytes()).hexdigest())
