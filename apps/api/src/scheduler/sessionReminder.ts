/**
 * Session Reminder Scheduler
 * ---------------------------
 * Uses node-cron to fire at the top of every calendar minute (instead of
 * N seconds after server start). On startup it also runs a catch-up pass
 * that covers any gap since the last successful run, so reminders that
 * should have fired during a server restart are never silently dropped.
 *
 * Persistence: the key "scheduler_reminder_last_run_at" in system_settings
 * stores the Unix-ms timestamp of the last successful job run.
 *
 * Guards:
 *  - No duplicate: skips if a session_reminder for the same (userId, sessionId) exists
 *  - Respects sessionReminders toggle in notificationSettings (skips if disabled)
 *  - Respects dndDuringPrayer (approximate prayer-window check)
 */

import { schedule } from "node-cron";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import {
  db,
  sessions,
  sessionParticipants,
  notifications,
  notificationSettings,
  users,
  systemSettings,
} from "@workspace/db";
import { logger } from "../lib/logger";

// ── Constants ─────────────────────────────────────────────────────────────────

const LAST_RUN_KEY = "scheduler_reminder_last_run_at";

/** How far ahead we look for upcoming sessions (max reminderBeforeMinutes + 2 min buffer) */
const MAX_LOOK_AHEAD_MS = (1440 + 2) * 60 * 1000;

/** Grace window added to the upper bound to absorb slight cron drift (ms) */
const UPPER_GRACE_MS = 5_000;

// ── Prayer-window helper ───────────────────────────────────────────────────────

/** Approximate prayer windows (UTC offsets assumed server-side; kept simple) */
const PRAYER_WINDOWS_UTC: Array<[number, number]> = [
  [3, 4],   // Fajr region
  [11, 12], // Dhuhr region
  [14, 15], // Asr region
  [17, 18], // Maghrib region
  [19, 20], // Isha region
];

function isDuringPrayer(): boolean {
  const hourUTC = new Date().getUTCHours();
  return PRAYER_WINDOWS_UTC.some(([s, e]) => hourUTC >= s && hourUTC < e);
}

// ── Formatting helper ──────────────────────────────────────────────────────────

/** Returns an Arabic human-readable "X دقيقة" or "يوم" string */
function minutesLabel(minutes: number): string {
  if (minutes === 1440) return "يوم";
  if (minutes === 60) return "ساعة";
  return `${minutes} دقيقة`;
}

// ── system_settings persistence ───────────────────────────────────────────────

/** Read the last successful run timestamp from system_settings (null if never run). */
async function getLastRunAt(): Promise<Date | null> {
  const rows = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, LAST_RUN_KEY));

  if (rows.length === 0 || !rows[0]) return null;
  const ts = Number(rows[0].value);
  return Number.isNaN(ts) ? null : new Date(ts);
}

/** Persist the last successful run timestamp. */
async function setLastRunAt(ts: Date): Promise<void> {
  await db
    .insert(systemSettings)
    .values({
      id: crypto.randomUUID(),
      key: LAST_RUN_KEY,
      value: String(ts.getTime()),
      description: "Last successful run of the session reminder scheduler (Unix ms)",
    })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: {
        value: String(ts.getTime()),
        updatedAt: new Date(),
      },
    });
}

// ── Core job ───────────────────────────────────────────────────────────────────

/**
 * Run the session-reminder job.
 *
 * @param lowerBoundOverride  When provided, use this as the lower bound of the
 *   "fire window" instead of `now - 60 s`. Used for catch-up runs on startup
 *   to cover the entire gap since the last successful run.
 */
export async function runSessionReminderJob(lowerBoundOverride?: Date): Promise<void> {
  try {
    const now = new Date();

    const windowEnd = new Date(now.getTime() + MAX_LOOK_AHEAD_MS);

    // Sessions that haven't started yet and are scheduled/confirmed
    const upcomingSessions = await db
      .select({
        id: sessions.id,
        title: sessions.title,
        scheduledAt: sessions.scheduledAt,
        durationMinutes: sessions.durationMinutes,
        teacherId: sessions.teacherId,
        studentId: sessions.studentId,
        type: sessions.type,
        sessionType: sessions.sessionType,
        meetingUrl: sessions.meetingUrl,
      })
      .from(sessions)
      .where(
        and(
          inArray(sessions.status, ["scheduled", "confirmed"]),
          gte(sessions.scheduledAt, now),
          lte(sessions.scheduledAt, windowEnd),
        ),
      );

    if (upcomingSessions.length === 0) {
      await setLastRunAt(now);
      return;
    }

    // Collect all unique userIds involved
    const sessionIds = upcomingSessions.map((s) => s.id);

    const participants = await db
      .select({ sessionId: sessionParticipants.sessionId, studentId: sessionParticipants.studentId })
      .from(sessionParticipants)
      .where(inArray(sessionParticipants.sessionId, sessionIds));

    const participantsBySession = new Map<string, string[]>();
    for (const p of participants) {
      const arr = participantsBySession.get(p.sessionId) ?? [];
      arr.push(p.studentId);
      participantsBySession.set(p.sessionId, arr);
    }

    const allUserIds = new Set<string>();
    for (const s of upcomingSessions) {
      allUserIds.add(s.teacherId);
      if (s.studentId) allUserIds.add(s.studentId);
      const pIds = participantsBySession.get(s.id) ?? [];
      for (const pid of pIds) allUserIds.add(pid);
    }

    if (allUserIds.size === 0) {
      await setLastRunAt(now);
      return;
    }

    // Fetch notification settings and user names for all involved users
    const [settingsRows, userRows] = await Promise.all([
      db
        .select()
        .from(notificationSettings)
        .where(inArray(notificationSettings.userId, [...allUserIds])),
      db
        .select({ id: users.id, fullName: users.fullName })
        .from(users)
        .where(inArray(users.id, [...allUserIds])),
    ]);

    const settingsByUser = new Map(settingsRows.map((r) => [r.userId, r]));
    const userNames = new Map(userRows.map((u) => [u.id, u.fullName]));

    // Check existing session_reminder notifications to avoid duplicates
    const existingReminders = await db
      .select({
        userId: notifications.userId,
        sessionId: sql<string>`${notifications.payload}->>'sessionId'`,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.type, "session_reminder"),
          inArray(notifications.userId, [...allUserIds]),
          inArray(sql`${notifications.payload}->>'sessionId'`, sessionIds),
        ),
      );

    const alreadySent = new Set(
      existingReminders.map((r) => `${r.userId}::${r.sessionId}`),
    );

    // ── Fire-window bounds ────────────────────────────────────────────────────
    // Normal tick:   [now - 60 s, now + 5 s]
    // Catch-up tick: [lowerBoundOverride, now + 5 s]
    //
    // The catch-up lower bound equals the last successful run time, so every
    // minute-boundary missed during downtime is covered exactly once.
    const lowerBound = lowerBoundOverride
      ? lowerBoundOverride.getTime()
      : now.getTime() - 60_000;
    const upperBound = now.getTime() + UPPER_GRACE_MS;

    const toInsert: Array<{
      id: string;
      userId: string;
      title: string;
      body: string;
      type: string;
      priority: string;
      primaryActionUrl: string;
      expiresAt: Date;
      payload: Record<string, unknown>;
    }> = [];

    for (const session of upcomingSessions) {
      const sessionMs = session.scheduledAt.getTime();

      const involvedUsers: string[] = [session.teacherId];
      if (session.type === "individual" && session.studentId) {
        involvedUsers.push(session.studentId);
      }
      const groupStudents = participantsBySession.get(session.id) ?? [];
      for (const pid of groupStudents) {
        if (!involvedUsers.includes(pid)) involvedUsers.push(pid);
      }

      for (const userId of involvedUsers) {
        const dedupKey = `${userId}::${session.id}`;
        if (alreadySent.has(dedupKey)) continue;

        const settings = settingsByUser.get(userId);
        const reminderEnabled = settings?.sessionReminders ?? true;
        const reminderBeforeMinutes = settings?.reminderBeforeMinutes ?? 30;
        const dndDuringPrayer = settings?.dndDuringPrayer ?? false;

        if (!reminderEnabled) continue;
        if (dndDuringPrayer && isDuringPrayer()) continue;

        // The moment we should fire the reminder for this user
        const reminderFireMs = sessionMs - reminderBeforeMinutes * 60_000;

        if (reminderFireMs < lowerBound || reminderFireMs > upperBound) continue;

        const sessionTitle = session.title ?? "الحلقة";

        const title = "تذكير: حلقتك بعد قليل";
        const body = "تبقى 15 دقيقة على بدء الحلقة.";

        const expiresAt = new Date(sessionMs + 2 * 60 * 60 * 1000);

        toInsert.push({
          id: crypto.randomUUID(),
          userId,
          title,
          body,
          type: "session_reminder",
          priority: "high",
          primaryActionUrl: userId === session.teacherId
            ? `/teacher/session/${session.id}`
            : `/student/session/${session.id}`,
          expiresAt,
          payload: {
            sessionId: session.id,
            sessionTitle,
            scheduledAt: session.scheduledAt.toISOString(),
            durationMinutes: session.durationMinutes,
            reminderBeforeMinutes,
            sessionKind: session.type,
            ...(session.meetingUrl ? { meetingUrl: session.meetingUrl } : {}),
          },
        });

        alreadySent.add(dedupKey);
      }
    }

    if (toInsert.length > 0) {
      await db.insert(notifications).values(toInsert).onConflictDoNothing();
      logger.info({ count: toInsert.length }, "session reminders created");
    }

    // Persist the successful run time so the next startup can compute the gap
    await setLastRunAt(now);
  } catch (err) {
    logger.error({ err }, "sessionReminderJob failed");
    // Do NOT update lastRunAt on failure so the next startup catch-up covers this gap
  }
}

// ── Scheduler bootstrap ────────────────────────────────────────────────────────

/**
 * Start the session reminder scheduler.
 *
 * Strategy:
 * 1. Read the last successful run timestamp from system_settings.
 * 2. If the gap since last run is > 60 s (i.e. a restart occurred mid-interval),
 *    run an immediate catch-up pass with the gap as the lower bound so no
 *    minute-boundary is skipped.
 * 3. Schedule the regular job with node-cron at "* * * * *" so it fires at
 *    the top of every calendar minute regardless of when the server started.
 */
export async function startSessionReminderScheduler(): Promise<void> {
  logger.info("session reminder scheduler starting");

  try {
    const lastRunAt = await getLastRunAt();
    const now = new Date();

    // Always run a catch-up pass on startup, regardless of gap size.
    //
    // Rationale: node-cron fires at the top of the NEXT calendar minute after
    // startup. If the server restarts 5 s after the previous run, the next cron
    // tick is up to ~55 s away. The normal window (now - 60 s) on that tick may
    // not reach back far enough to cover reminder fire-times that fell between
    // the last run's upper-grace bound and now, creating a silent drop window.
    // Running a catch-up here bridges [lastRunAt → now] unconditionally.
    const catchUpFrom = lastRunAt ?? new Date(now.getTime() - MAX_LOOK_AHEAD_MS);
    const gapSeconds = lastRunAt
      ? Math.round((now.getTime() - lastRunAt.getTime()) / 1000)
      : null; // null = first boot
    logger.info(
      { gapSeconds, catchUpFrom },
      "running startup catch-up reminder pass",
    );
    await runSessionReminderJob(catchUpFrom);
  } catch (err) {
    logger.error({ err }, "catch-up session reminder pass failed");
  }

  // Fire at the top of every calendar minute ("* * * * *")
  schedule("* * * * *", () => {
    runSessionReminderJob().catch((err) =>
      logger.error({ err }, "sessionReminderJob cron tick failed"),
    );
  });

  logger.info("session reminder scheduler started (cron: every calendar minute)");
}
