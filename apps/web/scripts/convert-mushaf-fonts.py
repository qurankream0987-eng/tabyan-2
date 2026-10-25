#!/usr/bin/env python3
"""convert-mushaf-fonts.py — تحويل خطوط المصحف QCF v2 من woff2 إلى TTF بلا فقد (M1).

لماذا: تسجيل الخطوط على iOS/Android (expo-font) لا يقبل woff2 — يتطلب TTF/OTF.
woff2 مجرد حاوية مضغوطة (Brotli + glyf transform) حول جداول sfnt نفسها؛
فك الضغط بـ fontTools يعيد TTF بنفس الـ glyphs والقياسات — تحويل lossless.

التحقق من عدم الفقد (لكل خط محوَّل، إلزامي):
  1) نفس مجموعة الـ glyphs ونفس ترتيبها (glyphOrder).
  2) نفس جدول cmap (خرائط codepoint→glyph — منطقة PUA).
  3) نفس القياسات الأفقية hmtx (عرض/إزاحة كل glyph).
  4) تطابق مخططات الحروف نقطة-بنقطة (RecordingPen على كل glyph).
  5) نفس units_per_em و ascender/descender.

الاستخدام:
  python3 scripts/convert-mushaf-fonts.py              # الصفحات الذهبية: 1 2 187 604 27
  python3 scripts/convert-mushaf-fonts.py 5 12 300     # صفحات محددة
  python3 scripts/convert-mushaf-fonts.py --all        # كامل الـ604 (~9 دقائق، ~160MB)

الخرج: public/mushaf/fonts-ttf/p{n}.ttf — نفس الاستضافة، فيجلبها الموبايل من
نفس مسارات الويب (لا backend جديد). لا يُعدَّل أي woff2 أصلي إطلاقاً.
"""
import sys
from io import BytesIO
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public/mushaf/fonts"
DST = ROOT / "public/mushaf/fonts-ttf"
GOLDEN = [1, 2, 187, 604, 27]


def record_glyphs(font: TTFont):
    gs = font.getGlyphSet()
    out = {}
    for name in font.getGlyphOrder():
        pen = RecordingPen()
        gs[name].draw(pen)
        out[name] = pen.value
    return out


def convert(page: int) -> None:
    src = SRC / f"p{page}.woff2"
    dst = DST / f"p{page}.ttf"
    original = TTFont(str(src))  # fontTools يفك woff2 تلقائياً (يتطلب brotli)
    original.flavor = None       # إزالة حاوية woff2 → sfnt/TTF خام
    buf = BytesIO()
    original.save(buf)

    # التحقق من عدم الفقد: أعد فتح الاثنين وقارن
    a = TTFont(str(src))
    b = TTFont(BytesIO(buf.getvalue()))
    assert a.getGlyphOrder() == b.getGlyphOrder(), f"p{page}: glyphOrder اختلف"
    assert a.getBestCmap() == b.getBestCmap(), f"p{page}: cmap اختلف"
    assert dict(a["hmtx"].metrics) == dict(b["hmtx"].metrics), f"p{page}: hmtx اختلف"
    assert a["head"].unitsPerEm == b["head"].unitsPerEm, f"p{page}: unitsPerEm اختلف"
    assert a["hhea"].ascent == b["hhea"].ascent and a["hhea"].descent == b["hhea"].descent, f"p{page}: hhea اختلف"
    ga, gb = record_glyphs(a), record_glyphs(b)
    assert ga == gb, f"p{page}: مخططات glyphs اختلفت"

    dst.write_bytes(buf.getvalue())
    print(f"✔ p{page}: {src.stat().st_size:,}B woff2 → {dst.stat().st_size:,}B ttf — "
          f"{len(ga)} glyph متطابقة (outline+cmap+hmtx)")


def main() -> None:
    args = sys.argv[1:]
    pages = (list(range(1, 605)) if "--all" in args
             else [int(a) for a in args] if args else GOLDEN)
    DST.mkdir(parents=True, exist_ok=True)
    for p in pages:
        convert(p)
    print(f"\n✔ تحويل lossless مُثبت لـ {len(pages)} خط — شغّل verify-mushaf.mjs للفحص الشامل")


if __name__ == "__main__":
    main()
