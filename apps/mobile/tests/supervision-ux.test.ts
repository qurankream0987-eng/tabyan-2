import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const mobileRoot = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, mobileRoot), "utf8");
const adminScreens = readdirSync(new URL("app/admin/", mobileRoot)).filter((file) => file.endsWith(".tsx"));

describe("Native supervision interaction rules", () => {
  it("never appends an action form to the end of a screen", () => {
    for (const file of adminScreens) {
      const source = read(`app/admin/${file}`);
      // The removed pattern: `{edit ? <Card accent>…` rendered after the list.
      expect(source, file).not.toMatch(/\{\s*(edit|editing|selected|open|resetTarget|key|selectedAssessment)\s*\?\s*\(?\s*<Card\b/);
    }
  });

  it("uses specific in-app confirmations instead of generic native alerts", () => {
    for (const file of adminScreens) {
      const source = read(`app/admin/${file}`);
      expect(source, file).not.toMatch(/confirmAr\(/);
      expect(source, file).not.toContain("تأكيد العملية");
    }
  });

  it("opens create/edit forms in sheets with a sticky footer", () => {
    for (const file of ["library", "levels", "sharia", "settings", "accounts", "assessments", "fatwas", "schedules"]) {
      const source = read(`app/admin/${file}.tsx`);
      expect(source, file).toContain("<AdminSheet");
      expect(source, file).toMatch(/footer=\{/);
    }
  });

  it("keeps Books on the shared Web/Native library contract", () => {
    const library = read("app/admin/library.tsx");
    expect(library).toContain("@workspace/tabyan-domain/admin-library");
    expect(library).not.toMatch(/\["other", "أخرى"\]/);
    expect(library).toContain("<ConfirmAction");
  });

  it("guards dismissal of edited forms and keeps touch targets ≥ 44pt", () => {
    const ui = read("components/admin/admin-ui.tsx");
    expect(ui).toContain("تجاهل التعديلات؟");
    expect(ui).toMatch(/iconAction: \{ width: 44, height: 44/);
    expect(ui).toMatch(/automaticallyAdjustKeyboardInsets/);
  });
});
