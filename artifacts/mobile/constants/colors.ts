// Native adapter for the shared design tokens — mirrors artifacts/tabyan's
// src/lib/design-tokens.ts adapter so Mobile and Web read the exact same
// source instead of a manually duplicated copy that can silently drift.
import tokens from "@workspace/design-tokens/tokens.json";

export type DesignTokens = typeof tokens;

export default tokens;
