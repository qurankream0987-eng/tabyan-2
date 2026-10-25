import { describe, expect, it } from "vitest";
import { getRecitationAiIndicator } from "./recitation-ai-indicator";

describe("recitation AI user indicator", () => {
  it("keeps the user-facing status within four clear states", () => {
    expect(getRecitationAiIndicator("listening", "active")).toMatchObject({
      kind: "listening",
      label: "تبيان AI • يستمع",
      shortLabel: "يستمع",
    });
    expect(getRecitationAiIndicator("listening", "paused")).toMatchObject({
      kind: "paused",
      label: "تبيان AI • متوقف مؤقتًا",
      shortLabel: "متوقف مؤقتًا",
    });
    expect(getRecitationAiIndicator("connecting", "active")).toMatchObject({
      kind: "reconnecting",
      label: "تبيان AI • إعادة الاتصال",
      shortLabel: "إعادة الاتصال",
    });
    expect(getRecitationAiIndicator("failed", "active")).toMatchObject({
      kind: "failed",
      label: "تبيان AI • تعذر الاتصال",
      shortLabel: "تعذر الاتصال",
    });
  });

  it("does not expose extra idle or stopping states to users", () => {
    expect(getRecitationAiIndicator("idle", "active").kind).toBe("reconnecting");
    expect(getRecitationAiIndicator("stopping", "active").kind).toBe("reconnecting");
  });
});