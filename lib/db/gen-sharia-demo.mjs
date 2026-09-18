// يولّد artifacts/tabyan/src/lib/demo/sharia-demo.ts من قاعدة البيانات الحقيقية
// شغّله بعد أي تغيير في بذور الدروس الشرعية: node lib/db/gen-sharia-demo.mjs
import pg from "pg";
import fs from "node:fs";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const levels = (
  await client.query(
    "SELECT id, name, name_en, order_index FROM levels WHERE path='sharia' AND is_active AND NOT is_hidden ORDER BY name_en, order_index",
  )
).rows;
const content = (
  await client.query(
    "SELECT level_id, title, description, text_body, page_count FROM sharia_content WHERE status='published' ORDER BY order_index, created_at",
  )
).rows;

const bySubject = {};
for (const lv of levels) {
  const lessons = content.filter((c) => c.level_id === lv.id);
  (bySubject[lv.name_en] ??= []).push({
    name: lv.name,
    order: lv.order_index,
    lessons: lessons.map((l) => ({
      title: l.title,
      description: l.description ?? "",
      textBody: l.text_body ?? "",
      pageCount: l.page_count ?? 1,
    })),
  });
}

const total = content.length;

const ts = `// هذا الملف مولّد آلياً من قاعدة البيانات (دروس شرعية حقيقية) لدعم وضع العرض التجريبي — لا تحرره يدوياً
// أعد توليده بعد تغيير البذور: node lib/db/gen-sharia-demo.mjs
import { SHARIA_SUBJECTS_LIST } from "@/lib/shariaMeta";

interface DemoLesson { title: string; description: string; textBody: string; pageCount: number }
interface DemoLevel { name: string; order: number; lessons: DemoLesson[] }

const DATA: Record<string, DemoLevel[]> = ${JSON.stringify(bySubject, null, 2)};

export const DEMO_SHARIA_SUMMARY = {
  total: ${total},
  completed: 0,
  remaining: ${total},
  percentage: 0,
  lastStudied: null as null | { contentId: string; title: string; levelName: string; subjectName: string; progressPercentage: number },
};

/** مواد الدروس الشرعية مع مستوياتها (معرّفات تجريبية نصية: aqeedah-1 …) */
export function demoShariaSubjects() {
  return SHARIA_SUBJECTS_LIST.map((s) => ({
    key: s.key as string,
    name: s.name as string,
    levels: (DATA[s.key] ?? []).map((l) => ({
      id: \`\${s.key}-\${l.order}\`,
      name: l.name,
      order: l.order,
      status: "available",
      progressPercentage: 0,
      contentCount: l.lessons.length,
    })),
  }));
}

/** محتوى مستوى تجريبي (levelKey مثل aqeedah-1 أو fiqh-1) */
export function demoShariaLevelContent(levelKey: string) {
  const dash = levelKey.lastIndexOf("-");
  const subject = levelKey.slice(0, dash);
  const order = Number(levelKey.slice(dash + 1));
  const subjectMeta = SHARIA_SUBJECTS_LIST.find((s) => s.key === subject);
  const lvl = (DATA[subject] ?? []).find((l) => l.order === order);
  if (!subjectMeta || !lvl) return null;
  return {
    level: { id: levelKey, name: lvl.name, subject, subjectName: subjectMeta.name as string, order },
    content: lvl.lessons.map((lsn, i) => ({
      id: \`\${levelKey}-\${i + 1}\`,
      title: lsn.title,
      author: "إعداد فريق تبيان",
      description: lsn.description,
      contentType: "text",
      durationMinutes: null as number | null,
      pageCount: lsn.pageCount as number | null,
      progressPercentage: 0,
      status: "available",
    })),
  };
}

/** درس تجريبي كامل مع السابق/التالي (contentId مثل aqeedah-1-2) */
export function demoShariaContent(contentId: string) {
  const parts = contentId.split("-");
  const idx = Number(parts.pop());
  const levelKey = parts.join("-");
  const data = demoShariaLevelContent(levelKey);
  if (!data || !Number.isInteger(idx) || idx < 1) return null;
  const lvl = (DATA[data.level.subject] ?? []).find((l) => l.order === data.level.order);
  const lsn = lvl?.lessons[idx - 1];
  if (!lsn) return null;
  return {
    content: {
      id: contentId,
      title: lsn.title,
      author: "إعداد فريق تبيان",
      description: lsn.description,
      contentType: "text",
      fileUrl: null as string | null,
      externalUrl: null as string | null,
      textBody: lsn.textBody,
      durationMinutes: null as number | null,
      pageCount: lsn.pageCount as number | null,
    },
    level: data.level,
    prev: idx > 1 ? { id: \`\${levelKey}-\${idx - 1}\`, title: data.content[idx - 2].title } : null,
    next: idx < data.content.length ? { id: \`\${levelKey}-\${idx + 1}\`, title: data.content[idx].title } : null,
    progressPercentage: 0,
    lastPosition: null as string | null,
    status: "available",
    bookmarked: false,
  };
}
`;

fs.writeFileSync("artifacts/tabyan/src/lib/demo/sharia-demo.ts", ts);
console.log(`sharia-demo.ts regenerated: ${total} lessons across ${levels.length} levels`);
await client.end();
