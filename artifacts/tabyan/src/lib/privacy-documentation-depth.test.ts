import { readFileSync } from "node:fs";
import {
  PRIVACY_INTRO,
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_REVIEW_NOTES,
  PRIVACY_UPDATED_AT,
  SUPPORT_CONTACT,
  SUPPORT_FAQS,
  SUPPORT_INTRO,
  SUPPORT_SAFETY_NOTICE,
} from "@workspace/tabyan-domain";
import { describe, expect, it } from "vitest";

const webPolicySource = readFileSync(
  new URL("../pages/PrivacyPolicy.tsx", import.meta.url),
  "utf8",
);
const nativePolicySource = readFileSync(
  new URL("../../../../artifacts/mobile/app/privacy.tsx", import.meta.url),
  "utf8",
);

function sectionCopy(
  section: (typeof PRIVACY_POLICY_SECTIONS)[number],
): string[] {
  return [
    section.title,
    ...(section.paragraphs ?? []),
    ...(section.bullets ?? []),
    ...(section.subsections ?? []).flatMap((subsection) => [
      subsection.title,
      ...subsection.paragraphs,
      ...(subsection.bullets ?? []),
    ]),
  ];
}

function sectionContentUnitCount(
  section: (typeof PRIVACY_POLICY_SECTIONS)[number],
): number {
  return (
    (section.paragraphs?.length ?? 0) +
    (section.bullets?.length ?? 0) +
    (section.subsections ?? []).reduce(
      (total, subsection) =>
        total +
        subsection.paragraphs.length +
        (subsection.bullets?.length ?? 0),
      0,
    )
  );
}

function wordTokens(text: string): string[] {
  return text.match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
}

const policyCopy = [
  PRIVACY_INTRO,
  PRIVACY_UPDATED_AT,
  ...PRIVACY_POLICY_SECTIONS.flatMap(sectionCopy),
];
const policyText = policyCopy.join("\n");
const faqText = SUPPORT_FAQS.flatMap(({ question, answer }) => [
  question,
  answer,
]).join("\n");
const policyDisclosureCopy = PRIVACY_POLICY_SECTIONS.flatMap((section) => [
  ...(section.paragraphs ?? []),
  ...(section.bullets ?? []),
  ...(section.subsections ?? []).flatMap((subsection) => [
    ...subsection.paragraphs,
    ...(subsection.bullets ?? []),
  ]),
]);
const allDisclosureCopy = [
  PRIVACY_INTRO,
  ...policyDisclosureCopy,
  ...PRIVACY_REVIEW_NOTES,
  SUPPORT_INTRO,
  SUPPORT_SAFETY_NOTICE,
  ...SUPPORT_FAQS.flatMap(({ question, answer }) => [question, answer]),
];
const disclosureSentences = allDisclosureCopy.flatMap((copy) =>
  copy
    .split(/(?<=[.!؟?])\s+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean),
);

describe("privacy documentation depth floor", () => {
  it("keeps at least the accepted structure and explanatory depth without pinning exact word counts", () => {
    const subsectionCount = PRIVACY_POLICY_SECTIONS.reduce(
      (total, section) => total + (section.subsections?.length ?? 0),
      0,
    );
    const contentUnitCount = PRIVACY_POLICY_SECTIONS.reduce(
      (total, section) => total + sectionContentUnitCount(section),
      0,
    );
    const tokens = wordTokens(policyText);
    const arabicWordCount = tokens.filter(
      (token) => /\p{Script=Arabic}/u.test(token) && /\p{L}/u.test(token),
    ).length;

    expect(PRIVACY_POLICY_SECTIONS.length).toBeGreaterThanOrEqual(24);
    expect(subsectionCount).toBeGreaterThanOrEqual(82);
    expect(SUPPORT_FAQS.length).toBeGreaterThanOrEqual(12);
    expect(PRIVACY_REVIEW_NOTES.length).toBeGreaterThanOrEqual(5);
    expect(tokens.length).toBeGreaterThanOrEqual(7_500);
    expect(arabicWordCount).toBeGreaterThanOrEqual(7_300);
    expect(contentUnitCount).toBeGreaterThanOrEqual(220);
    expect(wordTokens(faqText).length).toBeGreaterThanOrEqual(900);
  });

  it("keeps all section and subsection IDs unique", () => {
    const ids = PRIVACY_POLICY_SECTIONS.flatMap((section) => [
      section.id,
      ...(section.subsections ?? []).map((subsection) => subsection.id),
    ]);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("privacy disclosure safeguards", () => {
  it("keeps the support contacts and unapproved legal status", () => {
    expect(SUPPORT_CONTACT.displayPhone).toBe("0096541094994");
    expect(SUPPORT_CONTACT.email).toBe("qumsa99@gmail.com");

    const legalStatus = PRIVACY_POLICY_SECTIONS.find(
      (section) => section.id === "legal-status",
    );
    expect(legalStatus).toBeDefined();
    expect(sectionCopy(legalStatus!)).toContain(
      "تبيان ليست حاليًا شركة مسجلة ولا كيانًا قانونيًا مسجلًا. تُقدَّم الخدمة التعليمية تحت اسم تبيان، ولا تذكر هذه المسودة اسم شركة أو رقم تسجيل أو عنوانًا قانونيًا غير معتمد.",
    );

    const jurisdiction = legalStatus?.subsections?.find(
      (subsection) => subsection.id === "legal-jurisdiction",
    );
    expect(jurisdiction?.paragraphs.join(" ")).toContain(
      "الاختصاص القانوني لم يُحسم بعد.",
    );
  });

  it("does not describe WhatsApp/SMS verification or Apple sign-in as active", () => {
    const otpSentences = disclosureSentences.filter(
      (sentence) =>
        /WhatsApp|\bSMS\b/iu.test(sentence) &&
        /رمز|رموز|تحقق|OTP|verification/iu.test(sentence),
    );
    const nonActiveOtpStatement =
      /لم\s+(?:يظهر|يُعثر|يعثر|يتم)|لا\s+(?:يظهر|يرسل|ترسل|تُرسل|يوجد|يتوفر|تتوفر)|غير\s+(?:متاح|مفعّل|مفعلة)|بحاجة\s+إلى\s+تأكيد|يحتاج\s+إلى\s+تأكيد|تحتاج\s+إلى\s+تأكيد|لا\s+تفترض|not\s+(?:available|implemented)/iu;
    const activeOtpClaims = otpSentences.filter(
      (sentence) =>
        /يرسل|تُرسل|ترسل|يتيح|يوفر|يدعم|يستخدم|تستخدم|يفعّل|مفعّل|مفعلة|متاح|متاحة|تعمل|يدير|يستقبل|يستلم|يقدم|يقدّم|sends?|provides?|supports?|enables?|active|available/iu.test(
          sentence,
        ) && !nonActiveOtpStatement.test(sentence),
    );

    const appleAuthSentences = disclosureSentences.filter(
      (sentence) =>
        /Apple/iu.test(sentence) &&
        /تسجيل الدخول|دخول Apple|المصادقة|Sign[\s-]?In|OAuth/iu.test(sentence),
    );
    const nonActiveAppleStatement =
      /لم\s+(?:يظهر|يُعثر|يعثر)|لا\s+(?:يعرض|يدعم|يوفر|يتيح)|غير\s+(?:متاح|مدعوم)|not\s+(?:available|implemented)|no\s+Apple\s+(?:sign.?in|login)/iu;
    const activeAppleClaims = appleAuthSentences.filter(
      (sentence) =>
        /يدعم|يتيح|يوفر|يمكن|تستطيع|موجود|متاح|تتوفر|supports?|offers?|allows?|enables?|available/iu.test(
          sentence,
        ) && !nonActiveAppleStatement.test(sentence),
    );

    expect(policyText).toMatch(
      /لا\s+(?:يظهر في|ترسل)\s+مسارات التسجيل والدخول الحالية(?: إرسال)? رموز تحقق عبر WhatsApp أو SMS أو البريد الإلكتروني\./u,
    );
    expect(otpSentences.length).toBeGreaterThan(0);
    expect(
      otpSentences.every((sentence) => nonActiveOtpStatement.test(sentence)),
    ).toBe(true);
    expect(activeOtpClaims).toEqual([]);
    expect(appleAuthSentences.length).toBeGreaterThan(0);
    expect(
      appleAuthSentences.every((sentence) =>
        nonActiveAppleStatement.test(sentence),
      ),
    ).toBe(true);
    expect(activeAppleClaims).toEqual([]);
  });
});

describe("privacy policy presentation safeguards", () => {
  it("keeps the draft badge visible on Web and Native", () => {
    expect(webPolicySource).toContain("مسودة غير معتمدة");
    expect(nativePolicySource).toContain("مسودة غير معتمدة");
  });

  it("keeps policy body text at or above 12px on Web and 12sp on Native", () => {
    const webBodyFontSize = webPolicySource.match(
      /className="mt-1 text-\[(\d+(?:\.\d+)?)px\] leading-\[1\.55\] text-foreground"/u,
    )?.[1];
    const nativeBodyFontSize = nativePolicySource.match(
      /\bcopy:\s*\{[^}]*?\bfontSize:\s*(\d+(?:\.\d+)?)/u,
    )?.[1];

    expect(webBodyFontSize).toBeDefined();
    expect(Number(webBodyFontSize)).toBeGreaterThanOrEqual(12);
    expect(nativePolicySource).toMatch(
      /style=\{\[styles\.copy,\s*styles\.paragraph/u,
    );
    expect(nativeBodyFontSize).toBeDefined();
    expect(Number(nativeBodyFontSize)).toBeGreaterThanOrEqual(12);
  });
});
