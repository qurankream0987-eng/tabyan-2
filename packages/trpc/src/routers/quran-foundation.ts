import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import {
  QuranFoundationError,
  quranFoundationClient,
} from "../lib/quran-foundation-client";

function throwQuranFoundationError(error: unknown): never {
  if (error instanceof QuranFoundationError) {
    if (error.kind === "disabled") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "مصدر Quran Foundation متوقف حتى اعتماد إعداداته.",
      });
    }
    if (error.kind === "missing_credentials" || error.kind === "invalid_environment") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "يحتاج مصدر Quran Foundation إلى إعداد بيانات الخادم أولاً.",
      });
    }
    if (error.status === 401 || error.status === 403) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "بيانات Quran Foundation غير معتمدة لهذه البيئة.",
      });
    }
    if (error.status === 404) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "المحتوى المطلوب غير متاح في بيئة Quran Foundation الحالية.",
      });
    }
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "تعذر جلب محتوى القرآن من Quran Foundation.",
    });
  }
  throw new TRPCError({
    code: "BAD_GATEWAY",
    message: "تعذر جلب محتوى القرآن من Quran Foundation.",
  });
}

export const quranFoundationRouter = createRouter({
  configuration: publicQuery.query(() => {
    try {
      return quranFoundationClient.getConfiguration();
    } catch (error) {
      throwQuranFoundationError(error);
    }
  }),
  chapters: publicQuery.query(async () => {
    try {
      return await quranFoundationClient.listChapters();
    } catch (error) {
      throwQuranFoundationError(error);
    }
  }),
  page: publicQuery
    .input(z.object({ pageNumber: z.number().int().min(1).max(604) }))
    .query(async ({ input }) => {
      try {
        return await quranFoundationClient.getPage(input.pageNumber);
      } catch (error) {
        throwQuranFoundationError(error);
      }
    }),
});
