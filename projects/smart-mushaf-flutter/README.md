# Tabyan Smart Mushaf — Flutter candidate

An isolated Flutter Android/iOS/Web candidate using Tabyan's existing QCF v2
page data and page-specific TTF fonts. The Web build reads non-fixture pages
from the same-origin `/mushaf/` assets served by the current Tabyan Web artifact.

## Current limits

- Pages 1, 2, 187, and 604 are bundled fixtures. Web can load the remaining
  pages from `/mushaf/pages/` and `/mushaf/fonts-ttf/`; Native needs an absolute
  `TABYAN_QCF_ASSET_BASE_URL` build define pointing to those assets.
- Hide/reveal is manual UI behavior only; there is no microphone capture,
  recognition, Nabr/QRC connection, teacher mode, or account handoff.
- The prototype does not replace or alter the existing student Mushaf.
- QCF v2 asset reuse/distribution rights still require confirmation before a
  production bundle is created. Native authentication and device acceptance
  are also unresolved.

## Run and verify

From this directory, run `flutter pub get`, `flutter test`, and
`flutter run -d chrome` for a local Web preview. To test Web pages beyond the
four bundled fixtures, serve the app on the Tabyan Web origin so `/mushaf/`
resolves to the existing QCF v2 assets. Android and iOS targets are scaffolded,
but device acceptance has not been performed.

