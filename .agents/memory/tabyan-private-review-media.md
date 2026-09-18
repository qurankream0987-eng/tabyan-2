---
name: Private review media
description: Reliable admin playback of short, private admission videos through the Replit proxy.
---

# Private admission-video playback

For short admission videos, the protected storage route can be fetched with an Authorization header and rendered through a local Blob URL in the admin review player.

**Why:** Native HTML video Range requests through the development proxy can repeatedly abort before metadata is usable, even when the stored MP4 is structurally valid and the full authenticated fetch succeeds. A local Blob preserves playback and seeking without placing a bearer token in the media element's `src`.

**How to apply:** Keep the Blob path limited to short review clips, abort/revoke it on unmount, and keep direct diagnostics token-free. If review uploads become large, restore a proven streaming path rather than buffering large media in an admin tab.

For Native `expo-video`, private storage media should use a `VideoSource` object with the app token in an `Authorization` header; keep query-token URLs for web only.

**Why:** iOS/Android native media requests support authenticated headers, while query-token Range playback through the proxy was the failure mode shown in the review screen.

**How to apply:** Strip any `token` query parameter before handing private API storage URLs to Native `expo-video`, and keep the header path limited to the app's own storage origin.

The published web build must be checked separately after release: repeated `206` requests followed by `request aborted` indicate that an older direct-stream player is still serving, even when the source tree already contains the Blob player.

**Why:** Replit deployment keeps serving the last successful build until a new publish; local verification cannot prove that production is using the fixed media client.

**How to apply:** After publishing, review one admin video session and confirm the browser performs one authenticated full fetch for the short clip rather than repeated Range requests.

Native placement objects are not one uniform media class: a finalized production upload may be HEVC with `moov` at the end, while older uploads may be H.264 with `moov` at the front. Bind any iPhone diagnosis to the exact failing object before classifying codec, fast-start, or proxy behavior.

**Why:** A production sample comparison showed valid finalized placement files with materially different codecs and container layout; a source-level player fix cannot explain a failure without the exact object and device error.

**How to apply:** Record the object alias, codec, dimensions, duration, `moov` placement, authenticated request trace, and native AVPlayer error for the same session before applying a media fix.