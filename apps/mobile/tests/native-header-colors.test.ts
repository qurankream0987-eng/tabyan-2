import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const mobileRoot = new URL("../", import.meta.url);
const readMobileFile = (path: string) => readFileSync(new URL(path, mobileRoot), "utf8");

describe("Native header dark-mode surface", () => {
  const header = readMobileFile("components/ui/index.tsx");
  const theme = readMobileFile("lib/theme.tsx");
  const appRoot = readMobileFile("app/_layout.tsx");
  const screenTokens = JSON.parse(readMobileFile("constants/tokens.json")) as {
    modes: { dark: { background: string; secondary: string } };
  };

  it("uses the opaque page background for every native header and keeps Web on its card token", () => {
    expect(header).toContain('backgroundColor: Platform.OS === "web" ? colors.card : colors.background');
    expect(header).toContain('backgroundColor: colors.background');
    expect(appRoot).toContain("? colors.background");
  });

  it("uses a solid local dark-burgundy surface for Native header buttons", () => {
    expect(header).toContain("backgroundColor: colors.secondary");
    expect(theme).toContain("secondary: designTokens.modes.dark.secondary");
    expect(screenTokens.modes.dark.secondary).toBe("#4A1626");
  });

  it("uses the same authoritative dark background token for the screen and safe-area root", () => {
    expect(screenTokens.modes.dark.background).toBe("#2E0D15");
    expect(theme).toContain("background: designTokens.modes.dark.background");
    expect(appRoot).toContain("backgroundColor: Platform.OS === \"ios\"");
    expect(header).toContain("backgroundColor: colors.background");
  });
});
