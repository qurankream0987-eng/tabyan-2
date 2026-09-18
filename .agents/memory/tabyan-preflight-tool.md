---
name: Tabyan App Store preflight
description: Permanent physical-size and integrity gate for future App Store Launch attempts.
---

The Tabyan App Store preflight must measure the physical workspace, not `.replitignore` output, and fail above the internal 3,800,000,000-byte target. QCF integrity and Expo identity are independent gates; a size failure must not be masked by passing functional checks.

**Why:** The restored project previously exceeded the practical Launch payload size, while QCF, active deployment outputs, dependencies, Git/LFS, and unique recovery material all have preservation constraints.

**How to apply:** Run the repository preflight command before considering Launch. Keep it dry-run by default; any safe cleanup mode must be explicit and must never remove QCF, source, `node_modules`, `.git`, recovery assets, or active `dist`.

The unique uploaded recovery ZIPs can be detached safely when they are untracked, have no runtime/source references, and their hashes are verified in an external restore location; this reduced the measured workspace below the hard gate without touching QCF.

Expo web/iOS export success does not satisfy the native QCF gate. The native asset verifier must run separately and may fail when the QCF directory is intentionally detached; report that state instead of treating a JavaScript bundle as a native Mushaf proof.

**Why:** A clean Metro bundle can coexist with zero native Mushaf assets, so conflating the two would incorrectly authorize a release that cannot render the required reader.

**How to apply:** Record Expo config and export results independently from QCF file count/verifier status in every mobile preflight report.