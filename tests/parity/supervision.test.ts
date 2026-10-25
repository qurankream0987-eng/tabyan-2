import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bookingAvailability, matchesBookingContext, shariaSessionType } from "../../apps/mobile/lib/sharia-booking";

const web = (name: string) => readFileSync(new URL(`../../apps/web/src/pages/admin/${name}.tsx`, import.meta.url), "utf8");
const mobile = (name: string) => readFileSync(new URL(`../../apps/mobile/app/${name}.tsx`, import.meta.url), "utf8");
const mobileAdminCommon = () => readFileSync(new URL("../../apps/mobile/components/admin/admin-common.tsx", import.meta.url), "utf8");
const endpoints = (source: string) => {
  const canonical = source.includes("const api = trpc.admin") ? source.replace(/\bapi\./g, "trpc.admin.") : source;
  return [...new Set(Array.from(canonical.matchAll(/trpc\.(admin|sharia|dailyVerse)\.(\w+)\.use(?:Query|Mutation)/g), ([, group, name]) => `${group}.${name}`))].sort();
};

describe("Supervision Web/Mobile contract coverage (not device acceptance)", () => {
  it("pins Expo preview API calls to Development rather than the release-domain fallback", () => {
    const pkg = JSON.parse(readFileSync(new URL("../../apps/mobile/package.json", import.meta.url), "utf8"));
    for (const name of ["dev", "dev:android-proxy"]) {
      expect(pkg.scripts[name]).toContain('EXPO_PUBLIC_DOMAIN="${EXPO_PUBLIC_DOMAIN:?');
      expect(pkg.scripts[name]).not.toContain("productionDomain");
    }
    const metro = readFileSync(new URL("../../apps/mobile/metro.config.js", import.meta.url), "utf8");
    expect(metro).toContain("config.cacheVersion");
    expect(metro).toContain("process.env.EXPO_PUBLIC_DOMAIN");
  });
  const pairs = [
    ["AdminAccounts", "accounts"], ["AdminUsers", "users"], ["AdminSchedules", "schedules"],
    ["AdminLibrary", "library"], ["AdminLevels", "levels"], ["AdminSharia", "sharia"],
    ["AdminAssessments", "assessments"], ["AdminMuftis", "muftis"], ["AdminFatwas", "fatwas"],
    ["AdminPromotions", "promotions"], ["AdminQiraat", "qiraat"], ["AdminSettings", "settings"],
    ["AdminHome", "index"], ["AdminAnalytics", "analytics"], ["AdminAuditLog", "audit-log"],
    ["AdminNotifications", "notifications"], ["AdminSessionsMonitoring", "sessions-monitoring"],
  ];
  for (const [webName, mobileName] of pairs) it(`${mobileName} exposes the Web query/mutation surface`, () => {
    expect(endpoints(mobile(`admin/${mobileName}`))).toEqual(endpoints(web(webName)));
  });

  it("keeps reviews on protected canonical endpoints and declares hooks before loading returns", () => {
    const source = mobileAdminCommon();
    const loadingReturn = source.indexOf("if (q.isLoading)");
    const workflow = source.indexOf("export function AdminWorkflow");
    // The first loading guard belongs to the unused generic list; inspect only the workflow.
    const workflowLoading = source.indexOf("if (q.isLoading)", workflow);
    expect(loadingReturn).toBeGreaterThan(0);
    for (const match of source.slice(workflow, source.indexOf("export function AdminInput")).matchAll(/\buseState[<(]/g)) {
      expect(workflow + match.index!).toBeLessThan(workflowLoading);
    }
    expect(source).toContain('enabled: kind === "placement"');
    expect(source).toContain('enabled: kind === "kyc"');
    expect(source).not.toContain("QURAN_PLACEMENT_LEVEL_NAMES");
    expect(source).toContain("studentId: selected.userId, approve: false }");
    expect(source).toContain("utils.admin.kpis.invalidate()");
  });

  it("keeps pending + reviewed promotions, including teacher requests without videos", () => {
    const source = mobile("admin/promotions");
    expect(source).toContain("admin.promotionsList.useQuery");
    expect(source).not.toContain("promotionsPendingList.useQuery");
    expect(source).toContain('startsWith("teacher_request_")');
    expect(source).toContain("سجل المراجعات");
  });

  it("renders actual student history instead of counts alone", () => {
    const source = mobile("admin/users");
    expect(source).toContain("fileQuery.data.progress.map");
    expect(source).toContain("fileQuery.data.sessions.map");
    expect(source).toContain("progress.completedSessions");
    expect(source).toContain("session.teacherName");
    expect(source).toContain("/^[=+\\-@]/");
  });

  it("keeps review actions and notification submission in persistent footers", () => {
    for (const name of ["admin-common", "promotions", "qiraat", "notifications"]) {
      const source = name === "admin-common" ? mobileAdminCommon() : mobile(`admin/${name}`);
      expect(source, name).toContain("<AdminSheet");
      expect(source, name).toContain("footer={");
    }
  });

  it("does not require a Mobile-only timestamp for Web's recurring notifications", () => {
    const source = mobile("admin/notifications");
    expect(source).not.toContain("scheduledAt");
    expect(source).toContain("title.trim().length < 3");
    expect(source).toContain("recurrencePattern: recurring ? pattern : undefined");
  });

  it("has reachable learning paths and public terms without changing supervisor authorization", () => {
    expect(mobile("student/path")).toContain("<Quran allPaths");
    const terms = mobile("terms");
    expect(terms).toContain("مسودة غير معتمدة");
    expect([...terms.matchAll(/^  \["[١٢٣٤٥٦٧٨٩]/gm)]).toHaveLength(10);
    expect(mobile("admin/_layout")).toContain('role !== "admin"');
  });
});

describe("Sharia booking uses subject, level, mode and live capacity", () => {
  const schedule = { sessionType: "sharia_fiqh", sessionMode: "group", levelId: 20, maxStudents: 5, enrolledCount: 2, isAcceptingBookings: true };
  const context = { allowedTypes: ["sharia_fiqh", "sharia_aqeedah", "sharia_seerah"], shariaType: shariaSessionType("fiqh"), mode: "group", levelId: 20 };
  it("maps each supported subject to its canonical session type", () => {
    expect(["aqeedah", "fiqh", "seerah"].map(shariaSessionType)).toEqual(["sharia_aqeedah", "sharia_fiqh", "sharia_seerah"]);
    expect(shariaSessionType("unknown")).toBeUndefined();
  });
  it("accepts the correct subject/level group and unscoped levels", () => {
    expect(matchesBookingContext(schedule, context)).toBe(true);
    expect(matchesBookingContext({ ...schedule, levelId: null }, context)).toBe(true);
  });
  it.each([
    { sessionType: "sharia_aqeedah" }, { sessionType: "quran_hifz" }, { sessionMode: "individual" }, { levelId: 21 },
  ])("rejects an unrelated circle: %j", (change) => {
    expect(matchesBookingContext({ ...schedule, ...change }, context)).toBe(false);
  });
  it("distinguishes closed/full/open and never enables a full group", () => {
    expect(bookingAvailability(schedule)).toBe("open");
    expect(bookingAvailability({ ...schedule, isAcceptingBookings: false })).toBe("closed");
    expect(bookingAvailability({ ...schedule, enrolledCount: 5 })).toBe("full");
    expect(bookingAvailability({ ...schedule, enrolledCount: 8 })).toBe("full");
    expect(bookingAvailability({ ...schedule, sessionMode: "individual", enrolledCount: 5 })).toBe("open");
  });
});
