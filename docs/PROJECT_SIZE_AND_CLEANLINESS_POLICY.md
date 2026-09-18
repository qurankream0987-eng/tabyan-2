# Tabyan Project Size and Cleanliness Policy

## Purpose

Keep the active Tabyan workspace reproducible, reviewable, and small enough for App Store Launch without sacrificing application features, production data, or the complete Mushaf/QCF set.

## Permanent Rules

1. Measure physical workspace bytes before every App Store Launch; do not use `.replitignore` as an archive-size measurement.
2. Treat `3,800,000,000` physical bytes as the internal hard gate and aim for less than `3,300,000,000` when safely possible. These are Tabyan targets, not Replit official limits.
3. Classify every file larger than 100 MB before moving or deleting it.
4. Do not keep recovery ZIPs, old exports, or temporary bundles in the active Launch workspace. Preserve them in a separate recoverable location.
5. Never delete the only unique recovery copy unless an independently verified backup and a checkpoint exist.
6. Keep QCF canonical assets complete at `604` page JSON files, `604` canonical word files, and `604` fonts. Do not reduce fidelity or delete the canonical set.
7. Do not duplicate QCF assets across artifacts or generated outputs.
8. Do not delete `node_modules` as part of routine cleanup. Any future Launch staging strategy must prove dependency reproducibility and restore behavior first.
9. Remove only regeneratable caches and temporary files, and only through explicit review or `--clean-safe`.
10. Never delete active `dist` outputs without confirming the corresponding workflow rebuilds them and the currently served artifact is not using them.
11. Do not rewrite Git history, force-push, manually delete Git objects, or prune reachable LFS content as a size workaround.
12. Preserve Expo identity, Apple identity, Auth, API, Web, database schema, production data, and mobile features during size work.
13. Treat `UNKNOWN` as preserve. Static grep alone is not proof that a dynamic route, asset, or dependency is unused.
14. Use `pnpm app-store:preflight` before a Launch attempt. It is dry-run by default and must fail loudly when the physical target is exceeded.
15. Do not start EAS, TestFlight, Apple credential setup, or App Store Launch from the preflight tool.

## Safe Cleanup Mode

The optional `--clean-safe` flag may remove only regeneratable `.cache`, `coverage`, `logs`, and `tmp` paths. It never removes:

- QCF/Mushaf assets
- source code
- `node_modules`
- `.git`
- `attached_assets`
- recovery archives
- `dist` outputs

Run the default dry-run first and review every candidate before using any cleanup flag.

## Mushaf Distribution Rule

The current native QCF set remains the canonical fallback and is fully preserved. A future remote delivery design must first provide a versioned manifest, checksums, resumable downloads, persistent local cache, offline reopen behavior, and a tested rollback path before the canonical native assets can be excluded from a release strategy.