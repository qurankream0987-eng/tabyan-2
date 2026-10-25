/** Pure helpers used by the real booking screen and its regression tests. */
export type BookableSchedule = {
  sessionType: string;
  sessionMode: string;
  levelId: number | null;
  maxStudents: number;
  enrolledCount?: number;
  isAcceptingBookings?: boolean;
};

export function shariaSessionType(subject?: string): string | undefined {
  return ({ aqeedah: "sharia_aqeedah", fiqh: "sharia_fiqh", seerah: "sharia_seerah" } as Record<string, string>)[subject ?? ""];
}

export function matchesBookingContext(schedule: BookableSchedule, context: {
  allowedTypes?: readonly string[]; shariaType?: string; mode?: string; levelId: number | null;
}): boolean {
  if (context.allowedTypes && !context.allowedTypes.includes(schedule.sessionType)) return false;
  if (context.shariaType && schedule.sessionType !== context.shariaType) return false;
  if (context.mode === "group" && schedule.sessionMode !== "group") return false;
  return context.levelId == null || schedule.levelId == null || schedule.levelId === context.levelId;
}

export function bookingAvailability(schedule: BookableSchedule): "open" | "closed" | "full" {
  if (schedule.isAcceptingBookings === false) return "closed";
  if (schedule.sessionMode === "group" && Number(schedule.enrolledCount ?? 0) >= schedule.maxStudents) return "full";
  return "open";
}
