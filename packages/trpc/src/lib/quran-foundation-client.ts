import { Buffer } from "node:buffer";

export type QuranFoundationEnvironment = "prelive" | "production";

export type QuranFoundationConfiguration = {
  configured: boolean;
  enabled: boolean;
  environment: QuranFoundationEnvironment;
  availableChapterScope: "two-chapters" | "production";
};

export type QuranFoundationChapter = {
  id: number;
  nameArabic: string;
  nameSimple: string;
  versesCount: number;
  firstPage: number | null;
  lastPage: number | null;
};

export type QuranFoundationWord = {
  text: string;
  wordIndex: number | null;
  kind: string;
};

export type QuranFoundationVerse = {
  verseKey: string;
  surah: number;
  ayah: number;
  pageNumber: number;
  words: QuranFoundationWord[];
};

export type QuranFoundationPage = {
  pageNumber: number;
  verses: QuranFoundationVerse[];
};

export type QuranFoundationErrorKind =
  | "missing_credentials"
  | "disabled"
  | "invalid_environment"
  | "upstream_http"
  | "invalid_payload"
  | "network";

export class QuranFoundationError extends Error {
  constructor(
    readonly kind: QuranFoundationErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "QuranFoundationError";
  }
}

type ClientOptions = {
  clientId?: string;
  clientSecret?: string;
  enabled?: boolean;
  environment?: string;
  fetcher?: typeof fetch;
  now?: () => number;
};

type CachedToken = { value: string; expiresAt: number };

const API_PATH = "/content/api/v4";
const REQUEST_TIMEOUT_MS = 15_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asPositiveInteger(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function parseVerseKey(value: unknown): { verseKey: string; surah: number; ayah: number } | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{1,3}):(\d{1,3})$/.exec(value);
  if (!match) return null;
  const surah = asPositiveInteger(match[1]);
  const ayah = asPositiveInteger(match[2]);
  return surah && ayah ? { verseKey: value, surah, ayah } : null;
}

function parseWordLocation(value: unknown): number | null {
  if (typeof value === "number") return asPositiveInteger(value);
  if (typeof value !== "string") return null;
  const match = /(?:^|:)(\d+)$/.exec(value.trim());
  return match ? asPositiveInteger(match[1]) : null;
}

function requireArray(value: unknown, message: string): unknown[] {
  if (!Array.isArray(value)) throw new QuranFoundationError("invalid_payload", message);
  return value;
}

export class QuranFoundationClient {
  private readonly fetcher: typeof fetch;
  private readonly now: () => number;
  private token: CachedToken | null = null;
  private tokenRequest: Promise<CachedToken> | null = null;

  constructor(private readonly options: ClientOptions) {
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? Date.now;
  }

  getConfiguration(): QuranFoundationConfiguration {
    const environment = this.options.environment ?? "prelive";
    if (environment !== "prelive" && environment !== "production") {
      throw new QuranFoundationError(
        "invalid_environment",
        "QF_ENV must be either prelive or production.",
      );
    }
    return {
      configured: Boolean(this.options.clientId && this.options.clientSecret),
      enabled: this.options.enabled === true,
      environment,
      availableChapterScope: environment === "prelive" ? "two-chapters" : "production",
    };
  }

  async listChapters(): Promise<QuranFoundationChapter[]> {
    const url = new URL(`${this.apiBase()}${API_PATH}/chapters`);
    url.searchParams.set("language", "ar");
    const payload = await this.getJson(url);
    const rows = requireArray(
      isRecord(payload) ? payload.chapters : null,
      "Quran Foundation returned an invalid chapter list.",
    );

    return rows.map((row) => {
      if (!isRecord(row)) {
        throw new QuranFoundationError("invalid_payload", "Invalid chapter entry.");
      }
      const id = asPositiveInteger(row.id);
      const versesCount = asPositiveInteger(row.verses_count);
      if (
        !id ||
        !versesCount ||
        typeof row.name_arabic !== "string" ||
        typeof row.name_simple !== "string"
      ) {
        throw new QuranFoundationError("invalid_payload", "Invalid chapter fields.");
      }
      const pages = Array.isArray(row.pages) ? row.pages : [];
      return {
        id,
        nameArabic: row.name_arabic,
        nameSimple: row.name_simple,
        versesCount,
        firstPage: asPositiveInteger(pages[0]),
        lastPage: asPositiveInteger(pages[1]),
      };
    });
  }

  async getPage(pageNumber: number): Promise<QuranFoundationPage> {
    const url = new URL(`${this.apiBase()}${API_PATH}/verses/by_page/${pageNumber}`);
    url.searchParams.set("words", "true");
    url.searchParams.set("per_page", "50");
    url.searchParams.set("word_fields", "text_uthmani,location,char_type_name");
    url.searchParams.set("fields", "chapter_id,page_number");
    const payload = await this.getJson(url);
    const rows = requireArray(
      isRecord(payload) ? payload.verses : null,
      "Quran Foundation returned an invalid page response.",
    );
    if (rows.length === 0) {
      throw new QuranFoundationError("invalid_payload", "Quran Foundation returned an empty page.");
    }

    const verses = rows.map((row): QuranFoundationVerse => {
      if (!isRecord(row)) {
        throw new QuranFoundationError("invalid_payload", "Invalid verse entry.");
      }
      const parsedKey = parseVerseKey(row.verse_key);
      const surah = asPositiveInteger(row.chapter_id) ?? parsedKey?.surah;
      const ayah = asPositiveInteger(row.verse_number) ?? parsedKey?.ayah;
      const verseKey =
        parsedKey?.verseKey ?? (surah && ayah ? `${surah}:${ayah}` : null);
      if (!surah || !ayah || !verseKey) {
        throw new QuranFoundationError("invalid_payload", "Verse is missing canonical identity.");
      }

      const wordRows = requireArray(row.words, "Verse is missing word-level content.");
      let nextWordIndex = 1;
      const words = wordRows.map((word): QuranFoundationWord => {
        if (!isRecord(word) || typeof word.text_uthmani !== "string") {
          throw new QuranFoundationError("invalid_payload", "Invalid word entry.");
        }
        const kind =
          typeof word.char_type_name === "string" ? word.char_type_name : "word";
        if (kind !== "word") {
          return { text: word.text_uthmani, wordIndex: null, kind };
        }
        const wordIndex = parseWordLocation(word.location) ?? nextWordIndex;
        nextWordIndex = Math.max(nextWordIndex + 1, wordIndex + 1);
        return { text: word.text_uthmani, wordIndex, kind };
      });

      if (!words.some((word) => word.wordIndex !== null)) {
        throw new QuranFoundationError("invalid_payload", "Verse contains no canonical words.");
      }
      return {
        verseKey,
        surah,
        ayah,
        pageNumber: asPositiveInteger(row.page_number) ?? pageNumber,
        words,
      };
    });

    return { pageNumber, verses };
  }

  private apiBase(): string {
    const configuration = this.getConfiguration();
    return configuration.environment === "production"
      ? "https://apis.quran.foundation"
      : "https://apis-prelive.quran.foundation";
  }

  private oauthBase(): string {
    const configuration = this.getConfiguration();
    return configuration.environment === "production"
      ? "https://oauth2.quran.foundation"
      : "https://prelive-oauth2.quran.foundation";
  }

  private async getToken(forceRefresh = false): Promise<CachedToken> {
    if (!this.options.enabled) {
      throw new QuranFoundationError(
        "disabled",
        "Quran Foundation content access is disabled pending owner configuration.",
      );
    }
    const { clientId, clientSecret } = this.options;
    if (!clientId || !clientSecret) {
      throw new QuranFoundationError(
        "missing_credentials",
        "Quran Foundation server credentials are not configured.",
      );
    }
    if (!forceRefresh && this.token && this.token.expiresAt - this.now() > 60_000) {
      return this.token;
    }
    if (!forceRefresh && this.tokenRequest) return this.tokenRequest;

    const request = this.requestToken(clientId, clientSecret);
    this.tokenRequest = request;
    try {
      const token = await request;
      this.token = token;
      return token;
    } finally {
      if (this.tokenRequest === request) this.tokenRequest = null;
    }
  }

  private async requestToken(clientId: string, clientSecret: string): Promise<CachedToken> {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      scope: "content",
    });
    let response: Response;
    try {
      response = await this.fetcher(`${this.oauthBase()}/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new QuranFoundationError("network", "Could not reach Quran Foundation OAuth.");
    }
    if (!response.ok) {
      throw new QuranFoundationError(
        "upstream_http",
        "Quran Foundation OAuth rejected the configured credentials.",
        response.status,
      );
    }
    const payload: unknown = await response.json().catch(() => null);
    if (
      !isRecord(payload) ||
      typeof payload.access_token !== "string" ||
      !payload.access_token ||
      typeof payload.expires_in !== "number"
    ) {
      throw new QuranFoundationError("invalid_payload", "Invalid OAuth token response.");
    }
    return {
      value: payload.access_token,
      expiresAt: this.now() + payload.expires_in * 1_000,
    };
  }

  private async getJson(url: URL): Promise<unknown> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const token = await this.getToken(attempt === 1);
      let response: Response;
      try {
        response = await this.fetcher(url, {
          headers: {
            "x-auth-token": token.value,
            "x-client-id": this.options.clientId!,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch {
        throw new QuranFoundationError("network", "Could not reach Quran Foundation content.");
      }
      if (response.status === 401 && attempt === 0) {
        this.token = null;
        continue;
      }
      if (!response.ok) {
        throw new QuranFoundationError(
          "upstream_http",
          "Quran Foundation content request failed.",
          response.status,
        );
      }
      return response.json().catch(() => {
        throw new QuranFoundationError("invalid_payload", "Invalid Quran Foundation response.");
      });
    }
    throw new QuranFoundationError("upstream_http", "Quran Foundation authorization failed.", 401);
  }
}

export const quranFoundationClient = new QuranFoundationClient({
  clientId: process.env.QF_CLIENT_ID,
  clientSecret: process.env.QF_CLIENT_SECRET,
  enabled: process.env.QF_CONTENT_ENABLED === "true",
  environment: process.env.QF_ENV ?? "prelive",
});
