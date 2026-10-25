import { useEffect, type ReactNode } from "react";
import { Link } from "react-router";
import { publicSupportEmail } from "@/lib/public-contact";

type PublicLegalPageProps = {
  title: string;
  metaTitle: string;
  description: string;
  updatedAt: string;
  children: ReactNode;
  showReviewNotice?: boolean;
  showDescription?: boolean;
  compact?: boolean;
};

const metaTags = [
  { selector: 'meta[name="description"]', attributes: { name: "description" } },
  { selector: 'meta[property="og:title"]', attributes: { property: "og:title" } },
  { selector: 'meta[property="og:description"]', attributes: { property: "og:description" } },
  { selector: 'meta[property="og:type"]', attributes: { property: "og:type" } },
  { selector: 'meta[property="og:url"]', attributes: { property: "og:url" } },
  { selector: 'meta[property="og:image"]', attributes: { property: "og:image" } },
  { selector: 'meta[name="twitter:card"]', attributes: { name: "twitter:card" } },
  { selector: 'meta[name="twitter:title"]', attributes: { name: "twitter:title" } },
  { selector: 'meta[name="twitter:description"]', attributes: { name: "twitter:description" } },
  { selector: 'meta[name="twitter:image"]', attributes: { name: "twitter:image" } },
];

export default function PublicLegalPage({
  title,
  metaTitle,
  description,
  updatedAt,
  children,
  showReviewNotice = true,
  showDescription = false,
  compact = false,
}: PublicLegalPageProps) {
  useEffect(() => {
    const previousTitle = document.title;
    const basePath = import.meta.env.BASE_URL.replace(/\/?$/, "/");
    const pageUrl = `${window.location.origin}${window.location.pathname}`;
    const logoUrl = new URL(`${basePath}logo.svg`, window.location.origin).href;
    const values = [
      description,
      metaTitle,
      description,
      "website",
      pageUrl,
      logoUrl,
      "summary",
      metaTitle,
      description,
      logoUrl,
    ];
    const previousMeta = metaTags.map(({ selector }) => {
      const element = document.head.querySelector<HTMLMetaElement>(selector);
      return { element, content: element?.content ?? null };
    });
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const previousCanonical = canonical?.href ?? null;

    document.title = metaTitle;
    metaTags.forEach(({ selector, attributes }, index) => {
      const existing = document.head.querySelector<HTMLMetaElement>(selector);
      const element = existing ?? document.createElement("meta");
      if (!existing) {
        Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
        document.head.appendChild(element);
      }
      element.content = values[index];
    });

    const canonicalElement = canonical ?? document.createElement("link");
    if (!canonical) {
      canonicalElement.rel = "canonical";
      document.head.appendChild(canonicalElement);
    }
    canonicalElement.href = pageUrl;

    return () => {
      document.title = previousTitle;
      metaTags.forEach(({ selector }, index) => {
        const current = document.head.querySelector<HTMLMetaElement>(selector);
        if (previousMeta[index].content === null) current?.remove();
        else if (current) current.content = previousMeta[index].content;
      });
      if (previousCanonical === null) canonicalElement.remove();
      else canonicalElement.href = previousCanonical;
    };
  }, [description, metaTitle]);

  const logoBase = import.meta.env.BASE_URL.replace(/\/?$/, "/");

  return (
    <div lang="ar" dir="rtl" className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" aria-label="العودة إلى الصفحة الرئيسية لتبيان" className="inline-flex items-center gap-3">
            <img src={`${logoBase}logo.svg`} alt="شعار تبيان" width="42" height="42" className="h-10 w-10 object-contain" />
            <span className="font-amiri text-2xl font-bold text-burgundy dark:text-gold">تبيان</span>
          </Link>
          <Link
            to="/"
            className="rounded-full border border-border px-4 py-2 font-readex text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            العودة للرئيسية
          </Link>
        </div>
      </header>

      <main className={`mx-auto max-w-5xl px-4 sm:px-6 ${compact ? "py-4 sm:py-7" : "py-8 sm:py-12"}`}>
        <article className={`overflow-hidden border border-border bg-card shadow-sm ${compact ? "rounded-xl" : "rounded-3xl"}`}>
          <div className={`border-b border-border bg-muted/30 ${compact ? "px-4 py-4 sm:px-6 sm:py-5" : "px-5 py-8 sm:px-10 sm:py-10"}`}>
            <p className="font-readex text-xs font-semibold text-muted-foreground">تبيان · وثائق الخدمة</p>
            <h1 className={`mt-2 font-amiri font-bold leading-tight text-burgundy dark:text-gold ${compact ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl"}`}>{title}</h1>
            {showDescription ? (
              <p className={`mt-2 max-w-3xl font-readex text-muted-foreground ${compact ? "text-[12px] leading-[1.55] sm:text-[13px]" : "text-sm leading-7 sm:text-base"}`}>{description}</p>
            ) : null}
            <p className={`mt-2 font-readex text-muted-foreground ${compact ? "text-[11px]" : "text-sm"}`}>آخر تحديث: {updatedAt}</p>
          </div>

          {showReviewNotice && (
            <aside
              aria-label="تنبيه بشأن اكتمال الوثيقة"
              className="mx-5 mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 font-readex text-sm leading-7 text-foreground sm:mx-10"
            >
              <strong className="font-bold">نسخة أولية للمراجعة.</strong>{" "}
              هذه الوثيقة معلومات عامة وليست استشارة قانونية. لم تُقدَّم بعد بيانات الجهة القانونية المشغّلة أو الاختصاص القضائي؛
              لذلك لا تُعد هذه النسخة نهائية ولا ينبغي اعتمادها قبل استكمال تلك البيانات ومراجعتها.
              {publicSupportEmail
                ? " يوجد بريد دعم عام معلن، لكنه لا يعوّض استكمال البيانات القانونية."
                : " ولم يُفعّل بريد دعم عام حتى الآن."}
            </aside>
          )}

          <div className={compact ? "px-3 py-3 sm:px-5 sm:py-5" : "px-5 py-8 sm:px-10 sm:py-10"}>
            <div className={`legal-copy font-readex text-foreground ${compact ? "space-y-3 text-[12px] leading-[1.55] sm:text-[13px]" : "space-y-8 text-sm leading-8 sm:text-base"}`}>
              {children}
            </div>
          </div>
        </article>
      </main>

      <footer className="border-t border-border bg-card/60">
        <nav aria-label="روابط السياسات" className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-3 px-4 py-6 font-readex text-sm sm:px-6">
          <Link to="/" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">الرئيسية</Link>
          <Link to="/support" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">فريق دعم تبيان</Link>
          <Link to="/privacy" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">سياسة الخصوصية</Link>
          <Link to="/terms" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">الشروط والأحكام</Link>
        </nav>
      </footer>
    </div>
  );
}