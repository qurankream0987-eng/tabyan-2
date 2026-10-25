import { useState } from "react";
import PublicLegalPage from "@/components/legal/PublicLegalPage";
import {
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_INTRO,
  PRIVACY_REVIEW_NOTES,
  PRIVACY_UPDATED_AT,
  SUPPORT_CONTACT,
  privacySectionMatchesQuery,
} from "@workspace/tabyan-domain";

export default function PrivacyPolicy() {
  const [query, setQuery] = useState("");
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set());
  const [reviewOpen, setReviewOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const sections = PRIVACY_POLICY_SECTIONS.filter((section) => privacySectionMatchesQuery(section, query));
  const allExpanded = PRIVACY_POLICY_SECTIONS.length > 0 && PRIVACY_POLICY_SECTIONS.every((section) => openSections.has(section.id));

  const toggleSection = (id: string) => {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const setAllSections = (expanded: boolean) => {
    setOpenSections((current) => {
      const next = new Set(current);
      PRIVACY_POLICY_SECTIONS.forEach((section) => expanded ? next.add(section.id) : next.delete(section.id));
      return next;
    });
  };
  const copyContact = async (value: string, label: string) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      setCopyStatus(`تم نسخ ${label}.`);
    } catch {
      setCopyStatus("تعذّر النسخ من هذا المتصفح. يمكنك تحديد بيانات التواصل ونسخها يدويًا.");
    }
  };

  return (
    <PublicLegalPage
      title="سياسة الخصوصية"
      metaTitle="سياسة الخصوصية | تبيان"
      description={PRIVACY_INTRO}
      updatedAt={PRIVACY_UPDATED_AT}
      compact
      showReviewNotice={false}
      showDescription
    >
      <aside
        role="note"
        aria-label="حالة سياسة الخصوصية"
        className="rounded-xl border border-amber-600/35 bg-amber-500/10 p-3"
        data-testid="status-privacy-draft"
      >
        <p className="font-readex text-[15px] font-bold text-burgundy dark:text-gold">مسودة غير معتمدة</p>
        <p className="mt-1 text-[12px] leading-[1.55] text-foreground">
          هذه مسودة معلوماتية وليست استشارة قانونية. يلزم استكمال مراجعة المشغّل والاختصاص قبل اعتمادها.
        </p>
        <button
          type="button"
          aria-expanded={reviewOpen}
          aria-controls="privacy-review-notes"
          onClick={() => setReviewOpen((value) => !value)}
          className="mt-2 rounded-md px-2 py-1 text-[12px] font-semibold text-burgundy underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-gold"
        >
          {reviewOpen ? "إخفاء ملاحظات المراجعة" : "عرض ملاحظات المراجعة"}
        </button>
        <div id="privacy-review-notes" hidden={!reviewOpen}>
          <ul className="mt-2 list-disc space-y-1 pr-5 text-[12px] leading-[1.55] text-foreground">
            {PRIVACY_REVIEW_NOTES.map((note, index) => (
              <li key={note} data-testid={`text-privacy-review-note-${index + 1}`}>{note}</li>
            ))}
          </ul>
        </div>
      </aside>

      <section aria-label="البحث والتحكم في أقسام السياسة" className="rounded-xl border border-border bg-card/70 p-3">
        <label htmlFor="privacy-policy-search" className="mb-1 block text-[12px] font-semibold text-foreground">
          ابحث في سياسة الخصوصية
        </label>
        <input
          id="privacy-policy-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="اكتب كلمة للبحث داخل نص السياسة"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-[12px] leading-[1.5] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="input-privacy-search"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAllSections(true)}
            disabled={allExpanded || sections.length === 0}
            className="min-h-9 rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            data-testid="button-privacy-expand-all"
          >
            عرض جميع الأقسام
          </button>
          <button
            type="button"
            onClick={() => setAllSections(false)}
            disabled={openSections.size === 0}
            className="min-h-9 rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            data-testid="button-privacy-collapse-all"
          >
            طي جميع الأقسام
          </button>
          <span role="status" aria-live="polite" className="text-[11px] text-muted-foreground">
            {query.trim() ? `عدد الأقسام المطابقة: ${sections.length}` : `${PRIVACY_POLICY_SECTIONS.length} قسمًا`}
          </span>
        </div>
      </section>

      {sections.length === 0 ? (
        <p role="status" className="rounded-xl border border-border bg-card p-4 text-[12px] leading-[1.55]">
          لا توجد أقسام تطابق عبارة البحث. جرّب كلمة أخرى.
        </p>
      ) : sections.map((section) => {
        const expanded = openSections.has(section.id);
        return (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={`privacy-section-${section.id}`}
            className="overflow-hidden rounded-xl border border-border bg-card/70"
            data-testid={`privacy-section-${section.id}`}
          >
            <h2 className="m-0">
              <button
                id={`privacy-section-${section.id}`}
                type="button"
                aria-expanded={expanded}
                aria-controls={`privacy-body-${section.id}`}
                onClick={() => toggleSection(section.id)}
                className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-right hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-burgundy/10 text-[10px] font-bold text-burgundy dark:text-gold">
                    {String(PRIVACY_POLICY_SECTIONS.findIndex((item) => item.id === section.id) + 1).padStart(2, "0")}
                  </span>
                  <span className="font-readex text-[14px] font-semibold leading-[1.4] text-burgundy dark:text-gold">
                    {section.title}
                  </span>
                </span>
                <span aria-hidden="true" className="text-sm text-muted-foreground">{expanded ? "−" : "+"}</span>
              </button>
            </h2>
            <div id={`privacy-body-${section.id}`} hidden={!expanded} className="privacy-policy-body border-t border-border px-3 pb-3 pt-2">
              {section.paragraphs?.map((paragraph, paragraphIndex) => (
                <p key={`${section.id}-paragraph-${paragraphIndex}`} className="mt-1 text-[12px] leading-[1.55] text-foreground" data-testid={`text-privacy-${section.id}-${paragraphIndex + 1}`}>
                  {paragraph}
                </p>
              ))}
              {section.bullets?.length ? (
                <ul className="mt-2 list-disc space-y-1 pr-5 text-[12px] leading-[1.55] text-foreground">
                  {section.bullets.map((bullet, bulletIndex) => <li key={`${section.id}-bullet-${bulletIndex}`}>{bullet}</li>)}
                </ul>
              ) : null}
              {section.subsections?.map((subsection) => (
                <div key={subsection.id} className="mt-3 border-r-2 border-gold/60 pr-2">
                  <h3 className="text-[12px] font-bold leading-[1.5] text-foreground">{subsection.title}</h3>
                  {subsection.paragraphs.map((paragraph, paragraphIndex) => (
                    <p key={`${subsection.id}-paragraph-${paragraphIndex}`} className="mt-1 text-[12px] leading-[1.55] text-foreground">
                      {paragraph}
                    </p>
                  ))}
                  {subsection.bullets?.length ? (
                    <ul className="mt-1 list-disc space-y-1 pr-5 text-[12px] leading-[1.55] text-foreground">
                      {subsection.bullets.map((bullet, bulletIndex) => <li key={`${subsection.id}-bullet-${bulletIndex}`}>{bullet}</li>)}
                    </ul>
                  ) : null}
                </div>
              ))}
              {section.id === "contact" ? (
                <div className="mt-3 rounded-lg bg-muted/50 p-3">
                  <p className="text-[12px] font-bold text-foreground">فريق دعم تبيان</p>
                  <p className="mt-1 text-[12px] leading-[1.55] text-foreground">
                    واتساب / اتصال: <a href={SUPPORT_CONTACT.phoneHref} dir="ltr" className="font-semibold text-burgundy underline underline-offset-4 dark:text-gold">{SUPPORT_CONTACT.displayPhone}</a>
                  </p>
                  <p className="mt-1 text-[12px] leading-[1.55] text-foreground">
                    البريد الإلكتروني: <a href={SUPPORT_CONTACT.emailHref} dir="ltr" className="break-all font-semibold text-burgundy underline underline-offset-4 dark:text-gold">{SUPPORT_CONTACT.email}</a>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a href={SUPPORT_CONTACT.phoneHref} className="inline-flex min-h-9 items-center rounded-lg border border-border px-3 text-[12px] font-semibold hover:bg-background">اتصال</a>
                    <a href={SUPPORT_CONTACT.whatsappHref} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center rounded-lg border border-border px-3 text-[12px] font-semibold hover:bg-background">واتساب</a>
                    <a href={SUPPORT_CONTACT.emailHref} className="inline-flex min-h-9 items-center rounded-lg border border-border px-3 text-[12px] font-semibold hover:bg-background">البريد الإلكتروني</a>
                    <button type="button" onClick={() => void copyContact(SUPPORT_CONTACT.displayPhone, "رقم الدعم")} className="min-h-9 rounded-lg border border-border px-3 text-[12px] font-semibold hover:bg-background">نسخ الرقم</button>
                    <button type="button" onClick={() => void copyContact(SUPPORT_CONTACT.email, "البريد الإلكتروني")} className="min-h-9 rounded-lg border border-border px-3 text-[12px] font-semibold hover:bg-background">نسخ البريد</button>
                  </div>
                  {copyStatus ? <p role="status" aria-live="polite" className="mt-2 text-[11px] text-muted-foreground">{copyStatus}</p> : null}
                </div>
              ) : null}
            </div>
          </section>
        );
      })}
    </PublicLegalPage>
  );
}