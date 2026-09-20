import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tokens = JSON.parse(fs.readFileSync(path.join(root, "lib/design-tokens/tokens.json"), "utf8"));

const requiredModeRoles = [
  "background",
  "foreground",
  "card",
  "cardForeground",
  "primary",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "muted",
  "mutedForeground",
  "accent",
  "accentForeground",
  "destructive",
  "destructiveForeground",
  "success",
  "successForeground",
  "border",
  "input",
  "overlay",
  "burgundyBackground",
  "burgundyText",
  "burgundyBorder",
  "goldDarkText",
  "nightSurface",
];

const requiredGroups = ["brand", "modes", "typography", "spacing", "radius", "borders", "buttonStates"];
const errors = [];
for (const group of requiredGroups) {
  if (!tokens[group] || typeof tokens[group] !== "object") errors.push(`missing token group: ${group}`);
}

for (const mode of ["light", "dark"]) {
  const roles = tokens.modes?.[mode] ?? {};
  for (const role of requiredModeRoles) {
    if (!(role in roles)) errors.push(`missing ${mode} semantic role: ${role}`);
  }
}

const lightKeys = Object.keys(tokens.modes?.light ?? {}).sort();
const darkKeys = Object.keys(tokens.modes?.dark ?? {}).sort();
if (JSON.stringify(lightKeys) !== JSON.stringify(darkKeys)) {
  errors.push("light/dark semantic keys differ");
}

const mobileAdapter = fs.readFileSync(path.join(root, "artifacts/mobile/constants/colors.ts"), "utf8");
const webAdapter = fs.readFileSync(path.join(root, "artifacts/tabyan/src/lib/design-tokens.ts"), "utf8");
const webEntry = fs.readFileSync(path.join(root, "artifacts/tabyan/src/main.tsx"), "utf8");
const webCss = fs.readFileSync(path.join(root, "artifacts/tabyan/src/index.css"), "utf8");

// Metro (unlike Vite) can't resolve a raw relative import that escapes the
// mobile package outside node_modules — the shared tokens are wired in via
// the @workspace/design-tokens workspace package instead of the plain path.
if (!mobileAdapter.includes("lib/design-tokens/tokens.json") && !mobileAdapter.includes("@workspace/design-tokens")) {
  errors.push("Mobile adapter is not connected to the shared token source");
}
if (!webAdapter.includes("lib/design-tokens/tokens.json")) {
  errors.push("Web adapter is not connected to the shared token source");
}
if (!webEntry.includes("installWebDesignTokens()")) {
  errors.push("Web token adapter is not installed before rendering");
}
for (const mode of ["light", "dark"]) {
  for (const role of requiredModeRoles.filter((role) => role !== "overlay")) {
    const cssName = role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    if (!webCss.includes(`--tby-${mode}-${cssName}`)) {
      errors.push(`Web CSS does not consume ${mode}.${role}`);
    }
  }
}

if (errors.length > 0) {
  console.error(`Shared design tokens: FAIL\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Shared design tokens: PASS");
console.log(`Semantic roles per mode: ${lightKeys.length}`);
console.log(`Brand tokens: ${Object.keys(tokens.brand).length}`);
console.log(`Spacing tokens: ${Object.keys(tokens.spacing).length}`);