# Tabyan Smart Mushaf — Tanzil Source Assessment

**Assessment date:** 16 October 2026  
**Scope:** Quran text source only. This does not clear any font, page layout, audio, or QPC/QCF asset.

## Required verdict

**A. `TANZIL_LOCAL_PATH_IS_SUFFICIENT`**

At the source-selection level, retain the current Tanzil local/static Quran text provider; a replacement runtime provider is not required. This is not a code-level sign-off of the incoming RC1: the complete Smart Mushaf source project has not been uploaded into this workspace, so its provider, tokenizer, attribution rendering, tests, and build still need inspection.

## Answers to the source decision

1. **Can Tanzil remain the canonical Quran text source? — YES.** Tanzil documents its Uthmani text as a Unicode encoding of the Medina Mushaf, and says the supplied Quran text is based on the Hafs narration. Its download page offers Uthmani text in static formats. Keep the exact selected Tanzil edition/version and text unchanged.

2. **Does the text license itself exclude Tabyan’s ages 4–100 or product use? — NO.** Tanzil permits use in any website or application with clear source attribution and a link to Tanzil; it states no minimum user age. The referenced CC BY 3.0 deed permits commercial use. Follow Tanzil’s additional published instruction that its text must not be changed. This is a source-license assessment, not a determination of Tabyan’s compliance with other laws or policies.

3. **Can the Quran content stay local/static? — YES.** Tanzil offers downloadable text, XML, and SQL formats; the content need not be fetched from a runtime API, and no user or child data needs to be sent to Tanzil. The current Tanzil updates page lists Version 1.1, released 12 February 2021, as its latest text release. Pin the source version and monitor Tanzil’s update page or mailing list.

4. **Can word identity continue to derive from the existing canonical tokenizer? — YES, subject to implementation verification.** Word order within a stable `(surah, ayah)` boundary is sufficient to derive `wordIndex`; the content provider does not need vendor-specific word IDs. The tokenizer must preserve the source Unicode text exactly, must not normalize or rewrite Quran text, and must distinguish words from verse/pause/ornamental markers. A useful integrity test is that joining the rendered word segments reconstructs the original verse string exactly. The RC1 tokenizer source is not present here, so that implementation test remains pending.

5. **What attribution must remain?** Tanzil’s published notice says:

   ```text
   Tanzil Quran Text
   Copyright (C) 2007-2021 Tanzil Project
   License: Creative Commons Attribution 3.0
   ```

   Clearly identify the Tanzil Project as the source and link to [tanzil.net](https://tanzil.net/). Include the notice with verbatim copies and reproduce it appropriately in files derived from or containing a substantial portion of the text. Link the [license](https://tanzil.net/docs/text_license) and keep the text unchanged.

6. **Does the incoming project need Quran Foundation? — NO, based on the supplied handoff.** Its stated source is `TanzilQuranProvider`; the text is available locally. The isolated QF adapter already present in this Replit workspace belongs to the earlier interim prototype, not this incoming project. Keep it disabled and isolated as an optional future provider pending permission; make no QF request.

## Rights boundaries

| Resource | Cleared by the Tanzil text terms? |
|---|---|
| Tanzil Quran text, copied verbatim with the required source notice and link | Yes, for website/application use; the source terms say not to change the text |
| Tanzil’s separate fonts | Not established by the text license |
| Printed-page layout, page maps, or a 604-page QPC/QCF renderer | Not established by the text license |
| Audio or recitation-provider content | Not established by the text license |

Do not claim that text-source clearance proves QPC page-layout, font, audio, or renderer rights.

## Project status and next verification

- `QF_LIVE_REQUESTS`: `DISABLED`
- `QF_INTEGRATION`: `HOLD_FOR_PERMISSION`
- `TABYAN_AGE_RANGE`: unchanged at 4–100
- `QF_STATUS`: `OPTIONAL_FUTURE_PROVIDER_PENDING_PERMISSION`
- `WORDKEY` and the supplied provider/state architecture: unchanged
- QF requests, auth changes, database changes, Nabr calls, and Mushaf redesign: none
- The attached file is a handoff notice, not the promised project bundle. The new project's `REPLIT_HANDOFF.md`, `ARCHITECTURE.md`, `PROVIDER_CONTRACT.md`, tokenizer/provider implementation, tests, and build are not available in this workspace.

When the full bundle arrives, import it unchanged, read its handoff documents, run its baseline tests/build, then verify that the Tanzil provider includes all 114 surahs, uses the expected Uthmani/Hafs dataset verbatim, derives canonical word indices without altering text, and displays the required attribution. Do not switch to QF or change `WordKey` to complete that check.

## Sources

- [Tanzil Text License](https://tanzil.net/docs/text_license)
- [Tanzil Quran Text Download](https://tanzil.net/download/)
- [Tanzil Uthmani Text](https://tanzil.net/docs/uthmani)
- [Tanzil Medina Mushaf / Hafs basis](https://tanzil.net/docs/medina_mushaf)
- [Tanzil Text Updates](https://tanzil.net/updates/)
- [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/)
