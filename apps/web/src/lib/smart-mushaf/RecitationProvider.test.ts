import { describe, expect, it, vi } from "vitest";
import { MockUiRecitationProvider } from "./RecitationProvider";

describe("MockUiRecitationProvider", () => {
  it("sends provider-neutral observations with a development-only source label", () => {
    const provider = new MockUiRecitationProvider();
    const listener = vi.fn();
    const unsubscribe = provider.subscribe(listener);
    provider.emit({
      status: "confirmed",
      wordKey: { surah: 1, ayah: 1, wordIndex: 1 },
      stabilized: true,
    });

    expect(listener).toHaveBeenCalledWith({
      status: "confirmed",
      wordKey: { surah: 1, ayah: 1, wordIndex: 1 },
      stabilized: true,
      provider: "MOCK_UI",
    });
    unsubscribe();
    provider.emit({ status: "unknown" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
