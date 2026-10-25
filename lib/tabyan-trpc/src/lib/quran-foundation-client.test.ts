import { describe, expect, it, vi } from "vitest";
import {
  QuranFoundationClient,
  QuranFoundationError,
} from "./quran-foundation-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("QuranFoundationClient", () => {
  it("reports its configuration without revealing credentials", () => {
    const client = new QuranFoundationClient({
      clientId: "client-id",
      clientSecret: "secret-value",
      enabled: true,
      environment: "prelive",
    });
    expect(client.getConfiguration()).toEqual({
      configured: true,
      enabled: true,
      environment: "prelive",
      availableChapterScope: "two-chapters",
    });
    expect(JSON.stringify(client.getConfiguration())).not.toContain("secret-value");
  });

  it("fetches chapters server-side and normalizes only the required fields", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      if (String(input).includes("/oauth2/token")) {
        return jsonResponse({ access_token: "temporary", expires_in: 3600 });
      }
      return jsonResponse({
        chapters: [{
          id: 1,
          name_arabic: "الفاتحة",
          name_simple: "Al-Fatihah",
          verses_count: 7,
          pages: [1, 1],
          private_extra: "not forwarded",
        }],
      });
    });
    const client = new QuranFoundationClient({
      clientId: "test-id",
      clientSecret: "test-secret",
      enabled: true,
      environment: "prelive",
      fetcher,
    });

    await expect(client.listChapters()).resolves.toEqual([{
      id: 1,
      nameArabic: "الفاتحة",
      nameSimple: "Al-Fatihah",
      versesCount: 7,
      firstPage: 1,
      lastPage: 1,
    }]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const contentRequest = fetcher.mock.calls[1];
    expect(String(contentRequest[0])).toContain("/content/api/v4/chapters?language=ar");
    expect(new Headers(contentRequest[1]?.headers).get("x-client-id")).toBe("test-id");
  });

  it("maps Quran Foundation words to per-ayah canonical indices without changing text", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      if (String(input).includes("/oauth2/token")) {
        return jsonResponse({ access_token: "temporary", expires_in: 3600 });
      }
      return jsonResponse({
        verses: [{
          verse_key: "1:1",
          chapter_id: 1,
          verse_number: 1,
          page_number: 1,
          words: [
            { char_type_name: "word", location: 1, text_uthmani: "بِسْمِ" },
            { char_type_name: "word", location: 2, text_uthmani: "اللَّهِ" },
            { char_type_name: "end", text_uthmani: "۝" },
          ],
        }],
      });
    });
    const client = new QuranFoundationClient({
      clientId: "test-id",
      clientSecret: "test-secret",
      enabled: true,
      environment: "prelive",
      fetcher,
    });

    await expect(client.getPage(1)).resolves.toEqual({
      pageNumber: 1,
      verses: [{
        verseKey: "1:1",
        surah: 1,
        ayah: 1,
        pageNumber: 1,
        words: [
          { text: "بِسْمِ", wordIndex: 1, kind: "word" },
          { text: "اللَّهِ", wordIndex: 2, kind: "word" },
          { text: "۝", wordIndex: null, kind: "end" },
        ],
      }],
    });
    const pageRequest = fetcher.mock.calls[1];
    expect(String(pageRequest[0])).toContain("/verses/by_page/1?");
    expect(String(pageRequest[0])).toContain("word_fields=text_uthmani%2Clocation%2Cchar_type_name");
  });

  it("refreshes a rejected access token once and retries the content request once", async () => {
    let tokenNumber = 0;
    let contentNumber = 0;
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      if (String(input).includes("/oauth2/token")) {
        tokenNumber += 1;
        return jsonResponse({ access_token: `temporary-${tokenNumber}`, expires_in: 3600 });
      }
      contentNumber += 1;
      if (contentNumber === 1) return jsonResponse({ error: "expired" }, 401);
      return jsonResponse({
        chapters: [{
          id: 1,
          name_arabic: "الفاتحة",
          name_simple: "Al-Fatihah",
          verses_count: 7,
          pages: [1, 1],
        }],
      });
    });
    const client = new QuranFoundationClient({
      clientId: "test-id",
      clientSecret: "test-secret",
      enabled: true,
      environment: "prelive",
      fetcher,
    });

    await expect(client.listChapters()).resolves.toHaveLength(1);
    expect(tokenNumber).toBe(2);
    expect(contentNumber).toBe(2);
  });

  it("fails closed when service credentials are missing", async () => {
    const client = new QuranFoundationClient({ enabled: true, environment: "prelive" });
    await expect(client.listChapters()).rejects.toMatchObject({
      kind: "missing_credentials",
    } satisfies Partial<QuranFoundationError>);
  });

  it("does not call Quran Foundation until the content feature is explicitly enabled", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const client = new QuranFoundationClient({
      clientId: "test-id",
      clientSecret: "test-secret",
      environment: "prelive",
      fetcher,
    });
    expect(client.getConfiguration()).toMatchObject({ configured: true, enabled: false });
    await expect(client.listChapters()).rejects.toMatchObject({ kind: "disabled" });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
