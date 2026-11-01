import { createRouter, publicQuery } from "./middleware";
import type { inferRouterInputs } from "@trpc/server";
import { authRouter } from "./routers/auth";
import { studentRouter } from "./routers/student";
import { teacherRouter } from "./routers/teacher";
import { adminRouter } from "./routers/admin";
import { fatwaRouter } from "./routers/fatwa";
import { libraryRouter } from "./routers/library";
import { notificationsRouter } from "./routers/notifications";
import { shariaRouter } from "./routers/sharia";
import { dailyVerseRouter } from "./routers/daily-verse";
import { recitationRouter } from "./routers/recitation";
import { recitationAssignmentsRouter } from "./routers/recitation-assignments";
import { quranFoundationRouter } from "./routers/quran-foundation";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  student: studentRouter,
  teacher: teacherRouter,
  admin: adminRouter,
  fatwa: fatwaRouter,
  library: libraryRouter,
  notifications: notificationsRouter,
  sharia: shariaRouter,
  dailyVerse: dailyVerseRouter,
  recitation: recitationRouter,
  recitationAssignments: recitationAssignmentsRouter,
  quranFoundation: quranFoundationRouter,
});

export type AppRouter = typeof appRouter;
export type PlacementPathType = inferRouterInputs<AppRouter>["student"]["recordPlacementAttempt"]["pathType"];
