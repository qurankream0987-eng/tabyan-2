---
name: App Store QCF archive limit
description: Diagnostic evidence about native Mushaf/QCF size and Replit App Store Launch behavior.
---

The complete native QCF bundle is 1,812 files and about 172 MB: 604 page JSON files, 604 canonical word JSON files, and 604 TTF fonts. Detaching it temporarily allowed the App Store Launch retry to proceed, while the full bundle caused the archive-size investigation to remain unresolved.

**Why:** The successful detached retry demonstrates that QCF is a significant archive-size contributor, but it does not prove QCF is the only payload limit or make the detached app suitable for release.

**How to apply:** Keep the QCF bundle and its 604/604/604 integrity intact. Before a final iOS release, use a supported asset-delivery strategy that preserves the native Mushaf and recitation behavior without embedding the entire bundle in the Launch archive.