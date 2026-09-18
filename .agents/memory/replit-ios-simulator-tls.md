---
name: Replit iOS simulator TLS
description: Distinguishes Replit simulator certificate failures from Expo Launch and Apple signing failures.
---

An iOS simulator error saying the Expo development server certificate is invalid is a Replit internal-proxy trust failure, not an App Store distribution-certificate failure.

**Why:** The served certificate can be valid for the Expo development hostname yet chain to a Replit internal proxy root that the simulator does not trust. This occurs before application execution and is independent of Expo Launch; a failed Publish click that creates no Launch session remains a separate Replit-side issue. Expo's ngrok tunnel is only a workaround when the tunnel service is reachable.

**How to apply:** Inspect the failing hostname and certificate issuer first. Do not change the Bundle ID, Apple credentials, or production code to address this simulator message. Test the tunnel non-destructively; if it is unavailable, use a physical-device preview or wait for the simulator proxy trust path to recover.