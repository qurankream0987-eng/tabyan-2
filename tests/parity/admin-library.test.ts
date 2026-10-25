import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  EMPTY_LIBRARY_FILTERS, LIBRARY_CATEGORIES, LIBRARY_CONTENT_TYPES, LIBRARY_SECTIONS, LIBRARY_STATUSES, emptyLibraryDraft,
  filterLibraryBooks, libraryCreateInput, libraryDraftFromBook, libraryStatusToggle, libraryUpdateInput, validateLibraryDraft,
  withLibrarySource, withUploadedPdf, type LibraryBookRow,
} from "@workspace/tabyan-domain/admin-library";

const adminRouter = readFileSync(path.resolve(import.meta.dirname, "../../packages/trpc/src/routers/admin.ts"), "utf8");

function serverEnum(procedure: string, field: string): string[] {
  const start = adminRouter.indexOf(`${procedure}: adminProcedure`);
  const block = adminRouter.slice(start, adminRouter.indexOf(".mutation", start));
  const match = new RegExp(`${field}: z\\.enum\\(\\[([^\\]]+)\\]`).exec(block);
  if (!match) throw new Error(`${procedure}.${field} enum not found`);
  return match[1].split(",").map((value) => value.trim().replace(/"/g, "")).sort();
}

const book = (overrides: Partial<LibraryBookRow> = {}): LibraryBookRow => ({
  id: "b1", title: "الأربعون النووية", author: "النووي", category: "hadith", section: "general", contentType: "pdf",
  sourceType: "external", fileObjectKey: null, fileUrl: null, externalUrl: "https://example.org/a.pdf", textContent: null,
  coverUrl: null, description: null, audioUrl: null, levelIds: [], status: "published", ...overrides,
});

describe("supervision library contract (shared Web + Native)", () => {
  it("offers exactly the values the server accepts", () => {
    const keys = (pairs: readonly (readonly [string, string])[]) => pairs.map(([key]) => key).sort();
    expect(keys(LIBRARY_CATEGORIES)).toEqual(serverEnum("libraryCreate", "category"));
    expect(keys(LIBRARY_SECTIONS)).toEqual(serverEnum("libraryCreate", "section"));
    expect(keys(LIBRARY_CONTENT_TYPES)).toEqual(serverEnum("libraryCreate", "contentType"));
    expect(keys(LIBRARY_STATUSES)).toEqual(serverEnum("libraryUpdate", "status"));
  });

  it("requires an uploaded object key for uploaded PDFs, as the server does", () => {
    const draft = withLibrarySource({ ...emptyLibraryDraft(), title: "كتاب" }, "uploaded");
    expect(validateLibraryDraft(draft).file).toBeTruthy();
    const uploaded = withUploadedPdf(draft, "/objects/uploads/book.pdf");
    expect(validateLibraryDraft(uploaded)).toEqual({});
    const input = libraryCreateInput(uploaded);
    expect(input).toMatchObject({ sourceType: "uploaded", fileObjectKey: "/objects/uploads/book.pdf", fileUrl: "/objects/uploads/book.pdf" });
    expect(input.externalUrl).toBeUndefined();
  });

  it("validates title, link and text rules before submit", () => {
    expect(validateLibraryDraft({ ...emptyLibraryDraft(), title: " " }).title).toBe("العنوان مطلوب");
    expect(validateLibraryDraft({ ...emptyLibraryDraft(), title: "أ" }).title).toMatch(/قصير/);
    expect(validateLibraryDraft({ ...emptyLibraryDraft(), title: "رابط", contentType: "link" }).externalUrl).toBe("رابط الكتاب مطلوب");
    expect(validateLibraryDraft({ ...emptyLibraryDraft(), title: "نص", contentType: "text" }).textContent).toBeTruthy();
  });

  it("preserves stored fields on edit (legacy rows are not silently cleared)", () => {
    const legacy = book({ externalUrl: null, fileUrl: "https://cdn.example.org/legacy.pdf", textContent: "مقدمة", levelIds: [3, 4], section: "curriculum" });
    const input = libraryUpdateInput({ ...libraryDraftFromBook(legacy), id: legacy.id });
    expect(input.fileUrl).toBe("https://cdn.example.org/legacy.pdf");
    expect(input.textContent).toBe("مقدمة");
    expect(input.levelIds).toEqual([3, 4]);
  });

  it("only an explicit source switch clears the other source", () => {
    const uploaded = libraryDraftFromBook(book({ sourceType: "uploaded", fileObjectKey: "/objects/x.pdf", fileUrl: "/objects/x.pdf", externalUrl: null }));
    expect(uploaded.sourceType).toBe("uploaded");
    const external = withLibrarySource(uploaded, "external");
    expect(external.fileObjectKey).toBeNull();
    expect(external.fileUrl).toBe("");
    expect(libraryUpdateInput({ ...external, id: "b1", externalUrl: "https://x.org/b.pdf" })).toMatchObject({ sourceType: "external", fileObjectKey: null, fileUrl: null, externalUrl: "https://x.org/b.pdf" });
  });

  it("maps out-of-contract stored values to safe defaults instead of failing on save", () => {
    const draft = libraryDraftFromBook(book({ category: "other", section: "?", status: "draft" }));
    expect(draft.category).toBe("aqeedah");
    expect(draft.section).toBe("general");
    expect(draft.status).toBe("published");
  });

  it("filters by text and every filter group", () => {
    const rows = [book(), book({ id: "b2", title: "تحفة الأطفال", author: "الجمزوري", category: "tajweed", status: "archived", contentType: "text" })];
    expect(filterLibraryBooks(rows, "تحفة", EMPTY_LIBRARY_FILTERS).map((r) => r.id)).toEqual(["b2"]);
    expect(filterLibraryBooks(rows, "النووي", EMPTY_LIBRARY_FILTERS).map((r) => r.id)).toEqual(["b1"]);
    expect(filterLibraryBooks(rows, "", { ...EMPTY_LIBRARY_FILTERS, status: "archived" }).map((r) => r.id)).toEqual(["b2"]);
    expect(filterLibraryBooks(rows, "", { ...EMPTY_LIBRARY_FILTERS, contentType: "pdf", category: "hadith" }).map((r) => r.id)).toEqual(["b1"]);
  });

  it("only offers status toggles the server allows (published ⇄ archived)", () => {
    expect(libraryStatusToggle("published")?.next).toBe("archived");
    expect(libraryStatusToggle("archived")?.next).toBe("published");
    expect(libraryStatusToggle("hidden")).toBeNull();
  });
});
