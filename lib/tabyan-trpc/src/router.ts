import { createRouter, publicQuery } from "./middleware";
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
});

export type AppRouter = typeof appRouter;
