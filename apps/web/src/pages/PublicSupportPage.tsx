import { useEffect, useState } from "react";
import { Link } from "react-router";
import { BookOpen, Check, ChevronDown, Copy, Headphones, Mail, MessageCircle, Phone, ShieldAlert } from "lucide-react";
import { SUPPORT_CONTACT, SUPPORT_FAQS, SUPPORT_INTRO, SUPPORT_SAFETY_NOTICE } from "@workspace/tabyan-domain";

const supportMetaTitle = "فريق دعم تبيان | تبيان";
const supportMetaDescription =
  "تواصل مع فريق دعم تبيان، واطّلع على إجابات الأسئلة الشائعة حول الحساب والتسجيل والحلقات والخدمات التعليمية.";

export default function PublicSupportPage() {
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    const previousTitle = document.title;
    const basePath = import.meta.env.BASE_URL.replace(/\/?$/, "/");
    const pageUrl = `${window.location.origin}${window.location.pathname}`;
    const logoUrl = new URL(`${basePath}logo.png`, window.location.origin).href;
    const metaTags = [
      { selector: 'meta[name="description"]', attributes: { name: "description" }, content: supportMetaDescription },
      { selector: 'meta[property="og:title"]', attributes: { property: "og:title" }, content: supportMetaTitle },
      { selector: 'meta[property="og:description"]', attributes: { property: "og:description" }, content: supportMetaDescription },
      { selector: 'meta[property="og:type"]', attributes: { property: "og:type" }, content: "website" },
      { selector: 'meta[property="og:url"]', attributes: { property: "og:url" }, content: pageUrl },
      { selector: 'meta[property="og:image"]', attributes: { property: "og:image" }, content: logoUrl },
      { selector: 'meta[name="twitter:card"]', attributes: { name: "twitter:card" }, content: "summary_large_image" },
      { selector: 'meta[name="twitter:title"]', attributes: { name: "twitter:title" }, content: supportMetaTitle },
      { selector: 'meta[name="twitter:description"]', attributes: { name: "twitter:description" }, content: supportMetaDescription },
      { selector: 'meta[name="twitter:image"]', attributes: { name: "twitter:image" }, content: logoUrl },
    ];
    const previousMeta = metaTags.map(({ selector }) => {
      const element = document.head.querySelector<HTMLMetaElement>(selector);
      return { element, content: element?.content ?? null };
    });
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const previousCanonical = canonical?.href ?? null;

    document.title = supportMetaTitle;
    metaTags.forEach(({ selector, attributes, content }) => {
      const existing = document.head.querySelector<HTMLMetaElement>(selector);
      const element = existing ?? document.createElement("meta");
      if (!existing) {
        Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
        document.head.appendChild(element);
      }
      element.content = content;
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
  }, []);

  const logoBase = import.meta.env.BASE_URL.replace(/\/?$/, "/");
  const copyContact = async (value: string, label: string) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard is unavailable");
      await navigator.clipboard.writeText(value);
      setCopyStatus(`تم نسخ ${label}.`);
    } catch {
      setCopyStatus("تعذّر النسخ من هذا المتصفح. يمكنك تحديد بيانات التواصل ونسخها يدويًا.");
    }
  };

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

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="relative overflow-hidden bg-burgundy px-5 py-9 text-white sm:px-10 sm:py-12">
            <div aria-hidden="true" className="absolute -left-10 -top-16 h-56 w-56 rounded-full border border-gold/30" />
            <div aria-hidden="true" className="absolute -left-2 -top-8 h-40 w-40 rounded-full border border-gold/20" />
            <div className="relative">
              <p className="font-readex text-sm font-semibold text-gold">تبيان · مركز الدعم</p>
              <h1 className="mt-3 font-amiri text-3xl font-bold leading-tight sm:text-4xl">فريق دعم تبيان</h1>
              <p className="mt-4 max-w-3xl font-readex text-sm leading-7 text-white/85 sm:text-base" data-testid="text-support-intro">
                {SUPPORT_INTRO}
              </p>
            </div>
          </div>

          <div className="space-y-6 px-5 py-7 sm:px-10 sm:py-9">
            <section aria-labelledby="support-contact" className="rounded-2xl border border-border bg-background p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-burgundy/10 text-burgundy dark:bg-gold/10 dark:text-gold">
                    <Headphones aria-hidden="true" size={21} />
                  </span>
                  <div>
                    <h2 id="support-contact" className="font-amiri text-xl font-bold text-burgundy dark:text-gold">تواصل مع فريق الدعم</h2>
                    <p className="mt-1 font-readex text-sm leading-7 text-muted-foreground">
                      اختر الطريقة الأنسب لك، ولا تشارك معلومات الدخول السرية.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href={SUPPORT_CONTACT.phoneHref} data-testid="link-support-phone" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-burgundy px-4 py-2 font-readex text-sm font-bold text-white transition hover:opacity-90">
                    <Phone aria-hidden="true" size={16} />
                    <span dir="ltr">{SUPPORT_CONTACT.displayPhone}</span>
                  </a>
                  <a href={SUPPORT_CONTACT.whatsappHref} target="_blank" rel="noreferrer" data-testid="link-support-whatsapp" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 py-2 font-readex text-sm font-bold text-foreground transition hover:bg-muted">
                    <MessageCircle aria-hidden="true" size={16} />
                    واتساب
                  </a>
                  <a href={SUPPORT_CONTACT.emailHref} data-testid="link-support-email" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 py-2 font-readex text-sm font-bold text-foreground transition hover:bg-muted">
                    <Mail aria-hidden="true" size={16} />
                    <span dir="ltr">{SUPPORT_CONTACT.email}</span>
                  </a>
                  <button type="button" onClick={() => void copyContact(SUPPORT_CONTACT.displayPhone, "رقم الدعم")} data-testid="button-copy-phone" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 py-2 font-readex text-sm font-bold text-foreground transition hover:bg-muted">
                    {copyStatus.startsWith("تم نسخ رقم") ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
                    نسخ الرقم
                  </button>
                  <button type="button" onClick={() => void copyContact(SUPPORT_CONTACT.email, "البريد الإلكتروني")} data-testid="button-copy-email" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 py-2 font-readex text-sm font-bold text-foreground transition hover:bg-muted">
                    {copyStatus.startsWith("تم نسخ البريد") ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
                    نسخ البريد
                  </button>
                </div>
              </div>
              {copyStatus ? <p role="status" className="mt-3 font-readex text-xs leading-6 text-muted-foreground">{copyStatus}</p> : null}
            </section>

            <section aria-labelledby="support-safety-title" className="rounded-2xl border-2 border-amber-600/35 bg-amber-500/10 p-5 sm:p-6" data-testid="notice-support-safety">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-600/10 text-amber-800 dark:text-gold">
                  <ShieldAlert aria-hidden="true" size={23} />
                </span>
                <div>
                  <h2 id="support-safety-title" className="font-amiri text-xl font-bold text-burgundy dark:text-gold">حافظ على أمان حسابك</h2>
                  <p className="mt-2 font-readex text-base font-bold leading-8 text-foreground">
                    {SUPPORT_SAFETY_NOTICE}
                  </p>
                </div>
              </div>
            </section>

            <section aria-labelledby="support-faq-title">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="font-readex text-xs font-bold tracking-wide text-muted-foreground">إجابات واضحة، خطوة بخطوة</p>
                  <h2 id="support-faq-title" className="mt-1 font-amiri text-2xl font-bold text-burgundy dark:text-gold">الأسئلة الشائعة</h2>
                </div>
                <span className="rounded-full bg-burgundy/8 px-3 py-1 font-readex text-xs font-bold text-burgundy" aria-label={`${SUPPORT_FAQS.length} سؤالًا`}>
                  {SUPPORT_FAQS.length} سؤالًا
                </span>
              </div>
              <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
                {SUPPORT_FAQS.map((faq, index) => (
                  <details key={faq.question} className="group px-4 sm:px-6" data-testid={`faq-item-${index + 1}`}>
                    <summary
                      className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 font-readex text-sm font-bold leading-7 text-foreground marker:hidden focus-visible:outline-none"
                      data-testid={`button-faq-${index + 1}`}
                    >
                      <span>{faq.question}</span>
                      <ChevronDown aria-hidden="true" size={18} className="shrink-0 text-burgundy transition-transform group-open:rotate-180 dark:text-gold" />
                    </summary>
                    <p className="pb-5 pl-7 font-readex text-sm leading-7 text-muted-foreground" data-testid={`text-faq-answer-${index + 1}`}>
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-3 rounded-2xl bg-muted/35 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <BookOpen aria-hidden="true" size={20} className="shrink-0 text-burgundy dark:text-gold" />
                <div>
                  <h2 className="font-readex text-sm font-bold text-foreground">مزيد من التفاصيل حول بياناتك</h2>
                  <p className="mt-1 font-readex text-xs leading-6 text-muted-foreground">اطّلع على سياسة الخصوصية ومسودة المراجعة.</p>
                </div>
              </div>
              <Link to="/privacy" data-testid="link-support-privacy" className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-background px-4 py-2 font-readex text-sm font-bold text-burgundy transition hover:bg-burgundy/5 dark:text-gold">
                اقرأ سياسة الخصوصية
              </Link>
            </section>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card/60">
        <nav aria-label="روابط تبيان العامة" className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-3 px-4 py-6 font-readex text-sm sm:px-6">
          <Link to="/" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">الرئيسية</Link>
          <Link to="/privacy" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">سياسة الخصوصية</Link>
          <Link to="/terms" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">الشروط والأحكام</Link>
        </nav>
      </footer>
    </div>
  );
}