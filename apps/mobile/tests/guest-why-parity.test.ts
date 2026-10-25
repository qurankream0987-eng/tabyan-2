import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const website = readFileSync(new URL("../../web/src/pages/GuestHome.tsx", import.meta.url), "utf8");
const mobile = readFileSync(new URL("../app/guest.tsx", import.meta.url), "utf8");

describe("Why Tabyan content parity", () => {
  it("copies every website feature into the Native guest screen in the same order", () => {
    const websiteBlock = website.match(/const FEATURES = \[([\s\S]*?)\n\s*\];/)?.[1];
    const mobileBlock = mobile.match(/const WHY_TABYAN_FEATURES = \[([\s\S]*?)\n\] as const;/)?.[1];

    expect(websiteBlock).toBeDefined();
    expect(mobileBlock).toBeDefined();

    const websiteFeatures = [...websiteBlock!.matchAll(/text:\s*"([^"]+)"/g)].map((match) => match[1]);
    const mobileFeatures = [...mobileBlock!.matchAll(/title:\s*"([^"]+)"/g)].map((match) => match[1]);

    expect(mobileFeatures).toEqual(websiteFeatures);
    expect(mobileFeatures).toHaveLength(8);
  });
});
