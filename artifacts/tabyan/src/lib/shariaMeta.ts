import type { IconName } from "@/components/app/Icon";

/** بيانات المواد الشرعية الثلاث — المستويات نفسها تُدار من لوحة الإدارة ولا تُثبَّت هنا */
export const SHARIA_SUBJECT_META: Record<string, { icon: IconName; color: string; description: string }> = {
  aqeedah: {
    icon: "star",
    color: "#B8860B",
    description: "توحيد الله وأركان الإيمان — مسار اختياري بخمسة مستويات: ثلاثة الأصول، القواعد الأربع، العقيدة الواسطية، كتاب التوحيد، كشف الشبهات",
  },
  fiqh: {
    icon: "scale",
    color: "#800020",
    description: "أحكام العبادات والمعاملات على قول جمهور أهل العلم — الكتاب المعتمد: الوجيز في الفقه",
  },
  seerah: {
    icon: "books",
    color: "#2F6B3A",
    description: "السيرة النبوية المطهرة من المولد إلى الوفاة — كتابها المعتمد: الرحيق المختوم",
  },
};

export const SHARIA_SUBJECTS_LIST = [
  { key: "aqeedah", name: "العقيدة" },
  { key: "fiqh", name: "الفقه" },
  { key: "seerah", name: "السيرة النبوية" },
] as const;

export interface LessonSection {
  title: string;
  lines: string[];
}

/** يفكك نص الدرس المقسّم بعلامات «العنوان» إلى أقسام — مع احتواء أي نص حر قبل أول علامة */
export function parseLessonSections(textBody: string): LessonSection[] {
  const sections: LessonSection[] = [];
  let current: LessonSection | null = null;
  for (const raw of textBody.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^«(.+)»$/);
    if (m) {
      current = { title: m[1], lines: [] };
      sections.push(current);
    } else {
      if (!current) {
        current = { title: "الدرس", lines: [] };
        sections.push(current);
      }
      current.lines.push(line);
    }
  }
  return sections;
}
