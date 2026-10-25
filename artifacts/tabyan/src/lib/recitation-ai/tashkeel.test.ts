import { describe, expect, it } from "vitest";
import { compareTashkeel, tashkeelEvidence, TashkeelEvidenceMonitor } from "./tashkeel";

describe("experimental tashkeel channel", () => {
  it("reports no evidence for undiacritized ASR text (the common provider case)", () => {
    expect(tashkeelEvidence("الحمد لله رب العالمين").level).toBe("none");
    expect(compareTashkeel("الحمد", "ٱلْحَمْدُ")).toBe("insufficient");
  });

  it("matches a correctly vocalized word, mapping Uthmani sukun to the standard mark", () => {
    expect(compareTashkeel("الحَمْدُ", "ٱلْحَمْدُ")).toBe("match");
  });

  it("detects a differing haraka only when both letters carry marks", () => {
    expect(compareTashkeel("الحَمْدَ", "ٱلْحَمْدُ")).toBe("mismatch");
    // تشكيل جزئي: الحرف غير المشكول لا يُقارن
    expect(compareTashkeel("الحَمد", "ٱلْحَمْدُ")).toBe("match");
  });

  it("never turns a different word into a tashkeel error", () => {
    expect(compareTashkeel("الشُّكْرُ", "ٱلْحَمْدُ")).toBe("insufficient");
  });

  it("stays unknown until enough tokens are seen, then reports the provider's level", () => {
    const monitor = new TashkeelEvidenceMonitor();
    monitor.observe("الحمد لله");
    expect(monitor.level).toBe("unknown");
    for (let i = 0; i < 4; i += 1) monitor.observe("الحمد لله رب العالمين");
    expect(monitor.level).toBe("none");
  });
});
