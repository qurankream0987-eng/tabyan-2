import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const adminDir = import.meta.dirname;
const pages = readdirSync(adminDir).filter((file) => file.endsWith(".tsx"));
const read = (file: string) => readFileSync(path.join(adminDir, file), "utf8");

describe("Web supervision interaction rules", () => {
  it("uses the supervision dialog primitives (sticky footer, unsaved-changes guard) instead of the generic Modal", () => {
    for (const file of pages) expect(read(file), file).not.toMatch(/import Modal from "@\/components\/Modal"/);
  });

  it("never blocks on browser dialogs", () => {
    for (const file of pages) expect(read(file), file).not.toMatch(/\b(window\.)?(confirm|alert|prompt)\(/);
  });

  it("does not show fake metrics on the supervision home", () => {
    expect(read("AdminHome.tsx")).not.toMatch(/Sparkline/i);
  });

  it("keeps row actions at touch size (no 28–32px icon buttons)", () => {
    for (const file of pages) expect(read(file), file).not.toMatch(/<button[^>]*className="[^"]*\bw-(7|8) h-(6|8)\b/);
  });
});
