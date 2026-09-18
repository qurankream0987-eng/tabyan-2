---
name: Recitation contract separation
description: The durable behavioral boundary between open general recitation and assignment-backed educational recitation.
---

GENERAL and EDUCATIONAL recitation are distinct contracts keyed exclusively by `mode`; never infer an educational session from a range being present.

**Why:** A selected Mushaf display range is useful for local rendering and current Live Reveal, but it is not proof of a teacher-approved educational assignment. Treating it as one would create false completion/progress records.

**How to apply:** GENERAL may persist optional start context and must have no expected endpoint, automatic completion, or educational progress effect. Its local display range stays client-local while matcher behavior still needs it. EDUCATIONAL must obtain its expected range from a server-owned approved assignment. Until that source exists, reject educational creation fail-closed even if the client supplies a structurally valid range. Keep legacy range-bearing sessions readable and migrate additively.