#!/usr/bin/env python3
"""
Remove redundant `dark:text-gold` classes that appear alongside `text-burgundy`.

Because `text-burgundy` already flips to gold in dark mode via --burgundy-text
(defined in index.css), the `dark:text-gold` override beside it is dead weight.

SAFE: lines with `text-gold-dark dark:text-gold` are preserved — that pair is
an intentional light/dark gold distinction.
"""
import re
import sys
from pathlib import Path

PLACEHOLDER = "\x00TGD_PROTECTED\x00"
EXTENSIONS = {".tsx", ".ts", ".jsx", ".js"}

changed_files = 0
changed_lines = 0

src_root = Path(__file__).parent.parent / "src"

for path in sorted(src_root.rglob("*")):
    if path.suffix not in EXTENSIONS:
        continue

    original = path.read_text(encoding="utf-8")
    lines = original.splitlines(keepends=True)
    new_lines = []
    file_changed = False

    for line in lines:
        new_line = line

        if "text-burgundy" in new_line and "dark:text-gold" in new_line:
            # 1. Protect the intentional pair (text-gold-dark dark:text-gold)
            new_line = new_line.replace("text-gold-dark dark:text-gold", PLACEHOLDER)

            # 2. Remove ALL remaining " dark:text-gold" on this line
            #    (they are beside text-burgundy and therefore redundant)
            new_line = re.sub(r" dark:text-gold\b", "", new_line)

            # 3. Restore the protected pair
            new_line = new_line.replace(PLACEHOLDER, "text-gold-dark dark:text-gold")

            if new_line != line:
                file_changed = True
                changed_lines += 1

        new_lines.append(new_line)

    if file_changed:
        path.write_text("".join(new_lines), encoding="utf-8")
        changed_files += 1
        print(f"  cleaned: {path.relative_to(src_root.parent.parent)}")

print(f"\nDone — {changed_lines} lines cleaned across {changed_files} files.")
