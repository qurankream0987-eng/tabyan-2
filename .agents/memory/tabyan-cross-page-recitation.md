---
name: Cross-page recitation continuity
description: Matcher and preload constraints for uninterrupted GENERAL recitation across Mushaf pages.
---

For GENERAL recitation, preload the next page's JSON, QCF font, and canonical words, then append those words to the **same** matcher as soon as the preload resolves for the active session. Follow the page stored on a stable canonical matched word directly; do not gate navigation on visual page-end evidence or a final-only transcript.

**Why:** Preloading assets without extending the matcher leaves a boundary race: the first next-page transcript can arrive before the matcher knows its words. Requiring the visible page to be almost complete then blocks a legitimate surah transition after a pause or skipped tail words. Recreating or slicing the matcher corpus loses recovery and committed-progress continuity.

**How to apply:** Keep the complete current-page corpus for GENERAL; `startContext` may be sent as optional context but must not exclude earlier page words. Give GENERAL-only recovery a forward window across the loaded context, preserve the matcher through page changes, and prepare the subsequent page after every successful visual transition. Canonical source omits the optional basmala at most surah starts, so GENERAL may ignore a leading spoken basmala only at an imminent non-Fatiha/non-Tawbah boundary. EDUCATIONAL remains bounded to its server-approved local corpus.