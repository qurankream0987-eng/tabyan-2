---
name: Live-session deployment
description: Deployment constraint for Tabyan's WebSocket signaling and media diagnostics.
---

# Live session deployment

The current live-session signaling rooms and diagnostic sessions live in the API process memory.

**Why:** Separate API instances cannot relay signaling messages or share diagnostic cookies/state. An autoscaling deployment can therefore split a teacher, student, and observer across instances and prevent a shared call.

**How to apply:** Before broad production use, publish this WebSocket service on a single always-running VM with affinity, or move presence/signaling and diagnostic state to shared infrastructure. Do not treat an autoscale deployment as equivalent until that change is made.