---
name: NVIDIA hosted Arabic ASR gate
description: Outcome and decision rule for NVIDIA's hosted Nemotron ASR Streaming endpoint with Arabic.
---

Do not select the currently published NVIDIA Hosted Nemotron ASR Streaming Function ID for Tabyan Arabic recitation. It accepts the API credential at transport level but rejects the first multilingual `ar-AR` streaming configuration with gRPC `INVALID_ARGUMENT`, before audio is processed.

**Why:** NVIDIA documents Arabic (`ar-AR`) for Nemotron's `type=multi` profile, but its published Hosted gRPC instructions expose one Function ID and no documented way to select that profile. The selector documented for `type=multi` is a self-hosted NIM deployment setting, not a hosted request setting.

**How to apply:** Keep OpenAI as the active provider. Re-open the NVIDIA path only when NVIDIA provides a separately documented Hosted multilingual Function ID/profile selection and validate it with a real microphone before any provider switch.