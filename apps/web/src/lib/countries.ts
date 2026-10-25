import { normalizePhoneInput } from "@workspace/tabyan-trpc/input-normalization";

/** قائمة دول العالم ورموز الاتصال المشتركة بين مسارات التسجيل — الكويت افتراضياً، ثم الدول العربية، ثم بقية دول العالم */
export const COUNTRIES: { iso: string; name: string; dial: string; flag: string }[] = [
  { iso: "KW", name: "الكويت", dial: "965", flag: "🇰🇼" },
  { iso: "SA", name: "السعودية", dial: "966", flag: "🇸🇦" },
  { iso: "BH", name: "البحرين", dial: "973", flag: "🇧🇭" },
  { iso: "QA", name: "قطر", dial: "974", flag: "🇶🇦" },
  { iso: "AE", name: "الإمارات", dial: "971", flag: "🇦🇪" },
  { iso: "OM", name: "عُمان", dial: "968", flag: "🇴🇲" },
  { iso: "JO", name: "الأردن", dial: "962", flag: "🇯🇴" },
  { iso: "PS", name: "فلسطين", dial: "970", flag: "🇵🇸" },
  { iso: "LB", name: "لبنان", dial: "961", flag: "🇱🇧" },
  { iso: "SY", name: "سوريا", dial: "963", flag: "🇸🇾" },
  { iso: "IQ", name: "العراق", dial: "964", flag: "🇮🇶" },
  { iso: "YE", name: "اليمن", dial: "967", flag: "🇾🇪" },
  { iso: "EG", name: "مصر", dial: "20", flag: "🇪🇬" },
  { iso: "SD", name: "السودان", dial: "249", flag: "🇸🇩" },
  { iso: "LY", name: "ليبيا", dial: "218", flag: "🇱🇾" },
  { iso: "TN", name: "تونس", dial: "216", flag: "🇹🇳" },
  { iso: "DZ", name: "الجزائر", dial: "213", flag: "🇩🇿" },
  { iso: "MA", name: "المغرب", dial: "212", flag: "🇲🇦" },
  { iso: "MR", name: "موريتانيا", dial: "222", flag: "🇲🇷" },
  { iso: "SO", name: "الصومال", dial: "252", flag: "🇸🇴" },
  { iso: "DJ", name: "جيبوتي", dial: "253", flag: "🇩🇯" },
  { iso: "KM", name: "جزر القمر", dial: "269", flag: "🇰🇲" },
  { iso: "TR", name: "تركيا", dial: "90", flag: "🇹🇷" },
  { iso: "PK", name: "باكستان", dial: "92", flag: "🇵🇰" },
  // ── بقية دول العالم ──
  { iso: "US", name: "الولايات المتحدة", dial: "1", flag: "🇺🇸" },
  { iso: "CA", name: "كندا", dial: "1", flag: "🇨🇦" },
  { iso: "GB", name: "المملكة المتحدة", dial: "44", flag: "🇬🇧" },
  { iso: "FR", name: "فرنسا", dial: "33", flag: "🇫🇷" },
  { iso: "DE", name: "ألمانيا", dial: "49", flag: "🇩🇪" },
  { iso: "IT", name: "إيطاليا", dial: "39", flag: "🇮🇹" },
  { iso: "ES", name: "إسبانيا", dial: "34", flag: "🇪🇸" },
  { iso: "PT", name: "البرتغال", dial: "351", flag: "🇵🇹" },
  { iso: "NL", name: "هولندا", dial: "31", flag: "🇳🇱" },
  { iso: "BE", name: "بلجيكا", dial: "32", flag: "🇧🇪" },
  { iso: "CH", name: "سويسرا", dial: "41", flag: "🇨🇭" },
  { iso: "AT", name: "النمسا", dial: "43", flag: "🇦🇹" },
  { iso: "SE", name: "السويد", dial: "46", flag: "🇸🇪" },
  { iso: "NO", name: "النرويج", dial: "47", flag: "🇳🇴" },
  { iso: "DK", name: "الدنمارك", dial: "45", flag: "🇩🇰" },
  { iso: "FI", name: "فنلندا", dial: "358", flag: "🇫🇮" },
  { iso: "IE", name: "أيرلندا", dial: "353", flag: "🇮🇪" },
  { iso: "IS", name: "آيسلندا", dial: "354", flag: "🇮🇸" },
  { iso: "GR", name: "اليونان", dial: "30", flag: "🇬🇷" },
  { iso: "PL", name: "بولندا", dial: "48", flag: "🇵🇱" },
  { iso: "CZ", name: "تشيكيا", dial: "420", flag: "🇨🇿" },
  { iso: "SK", name: "سلوفاكيا", dial: "421", flag: "🇸🇰" },
  { iso: "HU", name: "هنغاريا", dial: "36", flag: "🇭🇺" },
  { iso: "RO", name: "رومانيا", dial: "40", flag: "🇷🇴" },
  { iso: "BG", name: "بلغاريا", dial: "359", flag: "🇧🇬" },
  { iso: "HR", name: "كرواتيا", dial: "385", flag: "🇭🇷" },
  { iso: "SI", name: "سلوفينيا", dial: "386", flag: "🇸🇮" },
  { iso: "RS", name: "صربيا", dial: "381", flag: "🇷🇸" },
  { iso: "BA", name: "البوسنة والهرسك", dial: "387", flag: "🇧🇦" },
  { iso: "ME", name: "الجبل الأسود", dial: "382", flag: "🇲🇪" },
  { iso: "MK", name: "شمال مقدونيا", dial: "389", flag: "🇲🇰" },
  { iso: "AL", name: "ألبانيا", dial: "355", flag: "🇦🇱" },
  { iso: "XK", name: "كوسوفو", dial: "383", flag: "🇽🇰" },
  { iso: "UA", name: "أوكرانيا", dial: "380", flag: "🇺🇦" },
  { iso: "BY", name: "بيلاروس", dial: "375", flag: "🇧🇾" },
  { iso: "MD", name: "مولدوفا", dial: "373", flag: "🇲🇩" },
  { iso: "RU", name: "روسيا", dial: "7", flag: "🇷🇺" },
  { iso: "KZ", name: "كازاخستان", dial: "7", flag: "🇰🇿" },
  { iso: "EE", name: "إستونيا", dial: "372", flag: "🇪🇪" },
  { iso: "LV", name: "لاتفيا", dial: "371", flag: "🇱🇻" },
  { iso: "LT", name: "ليتوانيا", dial: "370", flag: "🇱🇹" },
  { iso: "LU", name: "لوكسمبورغ", dial: "352", flag: "🇱🇺" },
  { iso: "MT", name: "مالطا", dial: "356", flag: "🇲🇹" },
  { iso: "CY", name: "قبرص", dial: "357", flag: "🇨🇾" },
  { iso: "AD", name: "أندورا", dial: "376", flag: "🇦🇩" },
  { iso: "MC", name: "موناكو", dial: "377", flag: "🇲🇨" },
  { iso: "SM", name: "سان مارينو", dial: "378", flag: "🇸🇲" },
  { iso: "LI", name: "ليختنشتاين", dial: "423", flag: "🇱🇮" },
  { iso: "FO", name: "جزر فارو", dial: "298", flag: "🇫🇴" },
  { iso: "GL", name: "جرينلاند", dial: "299", flag: "🇬🇱" },
  { iso: "CN", name: "الصين", dial: "86", flag: "🇨🇳" },
  { iso: "JP", name: "اليابان", dial: "81", flag: "🇯🇵" },
  { iso: "KR", name: "كوريا الجنوبية", dial: "82", flag: "🇰🇷" },
  { iso: "KP", name: "كوريا الشمالية", dial: "850", flag: "🇰🇵" },
  { iso: "IN", name: "الهند", dial: "91", flag: "🇮🇳" },
  { iso: "BD", name: "بنغلاديش", dial: "880", flag: "🇧🇩" },
  { iso: "LK", name: "سريلانكا", dial: "94", flag: "🇱🇰" },
  { iso: "MV", name: "جزر مالديف", dial: "960", flag: "🇲🇻" },
  { iso: "NP", name: "نيبال", dial: "977", flag: "🇳🇵" },
  { iso: "BT", name: "بوتان", dial: "975", flag: "🇧🇹" },
  { iso: "AF", name: "أفغانستان", dial: "93", flag: "🇦🇫" },
  { iso: "IR", name: "إيران", dial: "98", flag: "🇮🇷" },
  { iso: "TH", name: "تايلاند", dial: "66", flag: "🇹🇭" },
  { iso: "VN", name: "فيتنام", dial: "84", flag: "🇻🇳" },
  { iso: "MY", name: "ماليزيا", dial: "60", flag: "🇲🇾" },
  { iso: "SG", name: "سنغافورة", dial: "65", flag: "🇸🇬" },
  { iso: "ID", name: "إندونيسيا", dial: "62", flag: "🇮🇩" },
  { iso: "PH", name: "الفلبين", dial: "63", flag: "🇵🇭" },
  { iso: "MM", name: "ميانمار", dial: "95", flag: "🇲🇲" },
  { iso: "KH", name: "كمبوديا", dial: "855", flag: "🇰🇭" },
  { iso: "LA", name: "لاوس", dial: "856", flag: "🇱🇦" },
  { iso: "BN", name: "بروناي", dial: "673", flag: "🇧🇳" },
  { iso: "TL", name: "تيمور الشرقية", dial: "670", flag: "🇹🇱" },
  { iso: "MN", name: "منغوليا", dial: "976", flag: "🇲🇳" },
  { iso: "HK", name: "هونغ كونغ", dial: "852", flag: "🇭🇰" },
  { iso: "MO", name: "ماكاو", dial: "853", flag: "🇲🇴" },
  { iso: "TW", name: "تايوان", dial: "886", flag: "🇹🇼" },
  { iso: "AU", name: "أستراليا", dial: "61", flag: "🇦🇺" },
  { iso: "NZ", name: "نيوزيلندا", dial: "64", flag: "🇳🇿" },
  { iso: "FJ", name: "فيجي", dial: "679", flag: "🇫🇯" },
  { iso: "PG", name: "بابوا غينيا الجديدة", dial: "675", flag: "🇵🇬" },
  { iso: "SB", name: "جزر سليمان", dial: "677", flag: "🇸🇧" },
  { iso: "VU", name: "فانواتو", dial: "678", flag: "🇻🇺" },
  { iso: "WS", name: "ساموا", dial: "685", flag: "🇼🇸" },
  { iso: "TO", name: "تونغا", dial: "676", flag: "🇹🇴" },
  { iso: "TV", name: "توفالو", dial: "688", flag: "🇹🇻" },
  { iso: "NR", name: "ناورو", dial: "674", flag: "🇳🇷" },
  { iso: "CK", name: "جزر كوك", dial: "682", flag: "🇨🇰" },
  { iso: "MH", name: "جزر مارشال", dial: "692", flag: "🇲🇭" },
  { iso: "AZ", name: "أذربيجان", dial: "994", flag: "🇦🇿" },
  { iso: "AM", name: "أرمينيا", dial: "374", flag: "🇦🇲" },
  { iso: "GE", name: "جورجيا", dial: "995", flag: "🇬🇪" },
  { iso: "UZ", name: "أوزبكستان", dial: "998", flag: "🇺🇿" },
  { iso: "TM", name: "تركمانستان", dial: "993", flag: "🇹🇲" },
  { iso: "TJ", name: "طاجيكستان", dial: "992", flag: "🇹🇯" },
  { iso: "KG", name: "قرغيزستان", dial: "996", flag: "🇰🇬" },
  { iso: "MX", name: "المكسيك", dial: "52", flag: "🇲🇽" },
  { iso: "BR", name: "البرازيل", dial: "55", flag: "🇧🇷" },
  { iso: "AR", name: "الأرجنتين", dial: "54", flag: "🇦🇷" },
  { iso: "CL", name: "تشيلي", dial: "56", flag: "🇨🇱" },
  { iso: "CO", name: "كولومبيا", dial: "57", flag: "🇨🇴" },
  { iso: "VE", name: "فنزويلا", dial: "58", flag: "🇻🇪" },
  { iso: "PE", name: "بيرو", dial: "51", flag: "🇵🇪" },
  { iso: "EC", name: "الإكوادور", dial: "593", flag: "🇪🇨" },
  { iso: "BO", name: "بوليفيا", dial: "591", flag: "🇧🇴" },
  { iso: "PY", name: "باراغواي", dial: "595", flag: "🇵🇾" },
  { iso: "UY", name: "أوروغواي", dial: "598", flag: "🇺🇾" },
  { iso: "GY", name: "غويانا", dial: "592", flag: "🇬🇾" },
  { iso: "SR", name: "سورينام", dial: "597", flag: "🇸🇷" },
  { iso: "CU", name: "كوبا", dial: "53", flag: "🇨🇺" },
  { iso: "DO", name: "جمهورية الدومينيكان", dial: "1809", flag: "🇩🇴" },
  { iso: "HT", name: "هايتي", dial: "509", flag: "🇭🇹" },
  { iso: "JM", name: "جامايكا", dial: "1876", flag: "🇯🇲" },
  { iso: "PR", name: "بورتوريكو", dial: "1787", flag: "🇵🇷" },
  { iso: "TT", name: "ترينيداد وتوباغو", dial: "1868", flag: "🇹🇹" },
  { iso: "BS", name: "جزر البهاما", dial: "1242", flag: "🇧🇸" },
  { iso: "BB", name: "باربادوس", dial: "1246", flag: "🇧🇧" },
  { iso: "AG", name: "أنتيغوا وباربودا", dial: "1268", flag: "🇦🇬" },
  { iso: "DM", name: "دومينيكا", dial: "1767", flag: "🇩🇲" },
  { iso: "GD", name: "غرينادا", dial: "1473", flag: "🇬🇩" },
  { iso: "KN", name: "سانت كيتس ونيفيس", dial: "1869", flag: "🇰🇳" },
  { iso: "LC", name: "سانت لوسيا", dial: "1758", flag: "🇱🇨" },
  { iso: "VC", name: "سانت فنسنت والغرينادين", dial: "1784", flag: "🇻🇨" },
  { iso: "KY", name: "جزر كايمان", dial: "1345", flag: "🇰🇾" },
  { iso: "VI", name: "جزر فيرجن الأمريكية", dial: "1340", flag: "🇻🇮" },
  { iso: "AS", name: "ساموا الأمريكية", dial: "1684", flag: "🇦🇸" },
  { iso: "AI", name: "أنغويلا", dial: "1264", flag: "🇦🇮" },
  { iso: "GT", name: "غواتيمالا", dial: "502", flag: "🇬🇹" },
  { iso: "SV", name: "السلفادور", dial: "503", flag: "🇸🇻" },
  { iso: "HN", name: "هندوراس", dial: "504", flag: "🇭🇳" },
  { iso: "NI", name: "نيكاراغوا", dial: "505", flag: "🇳🇮" },
  { iso: "CR", name: "كوستاريكا", dial: "506", flag: "🇨🇷" },
  { iso: "PA", name: "بنما", dial: "507", flag: "🇵🇦" },
  { iso: "BZ", name: "بليز", dial: "501", flag: "🇧🇿" },
  { iso: "ZA", name: "جنوب أفريقيا", dial: "27", flag: "🇿🇦" },
  { iso: "NG", name: "نيجيريا", dial: "234", flag: "🇳🇬" },
  { iso: "GH", name: "غانا", dial: "233", flag: "🇬🇭" },
  { iso: "KE", name: "كينيا", dial: "254", flag: "🇰🇪" },
  { iso: "ET", name: "إثيوبيا", dial: "251", flag: "🇪🇹" },
  { iso: "ER", name: "إريتريا", dial: "291", flag: "🇪🇷" },
  { iso: "TZ", name: "تنزانيا", dial: "255", flag: "🇹🇿" },
  { iso: "UG", name: "أوغندا", dial: "256", flag: "🇺🇬" },
  { iso: "RW", name: "رواندا", dial: "250", flag: "🇷🇼" },
  { iso: "BI", name: "بوروندي", dial: "257", flag: "🇧🇮" },
  { iso: "SS", name: "جنوب السودان", dial: "211", flag: "🇸🇸" },
  { iso: "TD", name: "تشاد", dial: "235", flag: "🇹🇩" },
  { iso: "CM", name: "الكاميرون", dial: "237", flag: "🇨🇲" },
  { iso: "GA", name: "الغابون", dial: "241", flag: "🇬🇦" },
  { iso: "CG", name: "جمهورية الكونغو", dial: "242", flag: "🇨🇬" },
  { iso: "CD", name: "الكونغو الديمقراطية", dial: "243", flag: "🇨🇩" },
  { iso: "AO", name: "أنغولا", dial: "244", flag: "🇦🇴" },
  { iso: "GW", name: "غينيا بيساو", dial: "245", flag: "🇬🇼" },
  { iso: "GQ", name: "غينيا الاستوائية", dial: "240", flag: "🇬🇶" },
  { iso: "GN", name: "غينيا", dial: "224", flag: "🇬🇳" },
  { iso: "SN", name: "السنغال", dial: "221", flag: "🇸🇳" },
  { iso: "GM", name: "غامبيا", dial: "220", flag: "🇬🇲" },
  { iso: "ML", name: "مالي", dial: "223", flag: "🇲🇱" },
  { iso: "BF", name: "بوركينا فاسو", dial: "226", flag: "🇧🇫" },
  { iso: "NE", name: "النيجر", dial: "227", flag: "🇳🇪" },
  { iso: "TG", name: "توغو", dial: "228", flag: "🇹🇬" },
  { iso: "BJ", name: "بنين", dial: "229", flag: "🇧🇯" },
  { iso: "LR", name: "ليبيريا", dial: "231", flag: "🇱🇷" },
  { iso: "SL", name: "سيراليون", dial: "232", flag: "🇸🇱" },
  { iso: "CV", name: "كابو فيردي", dial: "238", flag: "🇨🇻" },
  { iso: "ST", name: "ساو تومي وبرينسيب", dial: "239", flag: "🇸🇹" },
  { iso: "SC", name: "سيشل", dial: "248", flag: "🇸🇨" },
  { iso: "MU", name: "موريشيوس", dial: "230", flag: "🇲🇺" },
  { iso: "MG", name: "مدغشقر", dial: "261", flag: "🇲🇬" },
  { iso: "MZ", name: "موزمبيق", dial: "258", flag: "🇲🇿" },
  { iso: "ZM", name: "زامبيا", dial: "260", flag: "🇿🇲" },
  { iso: "ZW", name: "زيمبابوي", dial: "263", flag: "🇿🇼" },
  { iso: "MW", name: "ملاوي", dial: "265", flag: "🇲🇼" },
  { iso: "LS", name: "ليسوتو", dial: "266", flag: "🇱🇸" },
  { iso: "BW", name: "بوتسوانا", dial: "267", flag: "🇧🇼" },
  { iso: "SZ", name: "إسواتيني", dial: "268", flag: "🇸🇿" },
  { iso: "NA", name: "ناميبيا", dial: "264", flag: "🇳🇦" },
];

export type CountryPhoneRule = { minLength: number; maxLength: number };

/** أطوال الأرقام المحلية الدقيقة للدول المعروفة — بقية دول العالم تُقبل بحدود E.164 العامة. */
export const COUNTRY_PHONE_RULES: Record<string, CountryPhoneRule> = {
  "965": { minLength: 8, maxLength: 8 }, // الكويت
  "966": { minLength: 9, maxLength: 10 }, // السعودية: 5XXXXXXXX أو 05XXXXXXXX
  "973": { minLength: 8, maxLength: 8 }, // البحرين
  "974": { minLength: 8, maxLength: 8 }, // قطر
  "971": { minLength: 9, maxLength: 9 }, // الإمارات
  "968": { minLength: 8, maxLength: 8 }, // عُمان
  "962": { minLength: 9, maxLength: 9 }, // الأردن
  "970": { minLength: 9, maxLength: 9 }, // فلسطين
  "961": { minLength: 7, maxLength: 8 }, // لبنان
  "963": { minLength: 9, maxLength: 9 }, // سوريا
  "964": { minLength: 10, maxLength: 10 }, // العراق
  "967": { minLength: 9, maxLength: 9 }, // اليمن
  "20": { minLength: 10, maxLength: 10 }, // مصر
  "249": { minLength: 9, maxLength: 9 }, // السودان
  "218": { minLength: 9, maxLength: 9 }, // ليبيا
  "216": { minLength: 8, maxLength: 8 }, // تونس
  "213": { minLength: 9, maxLength: 9 }, // الجزائر
  "212": { minLength: 9, maxLength: 9 }, // المغرب
  "90": { minLength: 10, maxLength: 10 }, // تركيا
  "92": { minLength: 10, maxLength: 10 }, // باكستان
};

/** حدود E.164 العامة للرقم الوطني (بعد رمز الدولة) — تُستخدم لأي دولة بلا قاعدة دقيقة.
    E.164 يسمح بـ15 رقماً إجمالاً؛ بأقصر رمز دولة (خانة واحدة) يصل الوطني إلى 14 */
const GENERIC_NATIONAL_MIN = 4;
const GENERIC_NATIONAL_MAX = 14;

/** الرقم الوطني بدون رمز الدولة — أرقام فقط */
export const NATIONAL_RE = /^\d+$/;

export function validatePhoneNumber(dial: string, national: string): string | null {
  if (!COUNTRIES.some((country) => country.dial === dial) || !NATIONAL_RE.test(national)) {
    return "رقم الهاتف غير صحيح، يرجى التأكد من الرقم وإعادة المحاولة.";
  }
  const rule = COUNTRY_PHONE_RULES[dial];
  // دولة لها قاعدة طول دقيقة → تُفرض؛ وغيرها تُقبل بحدود E.164 العامة —
  // الحد الأقصى يُقصّ حسب طول رمز الدولة حتى لا يتجاوز الإجمالي 15 رقماً (يطابق تحقق الخادم)
  const min = rule?.minLength ?? GENERIC_NATIONAL_MIN;
  const max = rule?.maxLength ?? Math.min(GENERIC_NATIONAL_MAX, 15 - dial.length);
  if (national.length < min || national.length > max) {
    return rule
      ? `رقم الهاتف غير صحيح، يجب أن يتكون من ${rule.minLength === rule.maxLength ? rule.minLength : `${rule.minLength} إلى ${rule.maxLength}`} أرقام.`
      : "رقم الهاتف غير صحيح، يرجى التأكد من الرقم وإعادة المحاولة.";
  }
  return null;
}

/**
 * يحافظ على حقل الهاتف كرقم وطني فقط.
 * يقبل اللصق بصيغة محلية أو E.164، ويزيل رمز الدولة المحدد حتى لا يصبح
 * الطلب +965965... عندما يلصق المستخدم الرقم الكامل داخل الحقل المحلي.
 */
export function normalizeNationalPhoneInput(dial: string, value: string): string {
  const compact = normalizePhoneInput(value);
  const digits = compact.replace(/\D/g, "");
  const rule = COUNTRY_PHONE_RULES[dial];
  const maxLength = rule?.maxLength ?? Math.min(GENERIC_NATIONAL_MAX, 15 - dial.length);
  const hasInternationalPrefix = compact.startsWith("+");
  let national = digits;

  while (
    dial &&
    national.startsWith(dial) &&
    (hasInternationalPrefix || national.length > maxLength)
  ) {
    national = national.slice(dial.length);
  }

  return national.slice(0, maxLength);
}

/** يركّب الرقم بصيغة E.164 من رمز الدولة والرقم الوطني (يحذف الأصفار البادئة) */
export function toE164(dial: string, national: string): string {
  const normalizedNational = normalizeNationalPhoneInput(dial, national);
  return `+${dial}${normalizedNational.replace(/^0+/, "")}`;
}

/** يفكّك رقماً مخزناً بصيغة E.164 إلى (رمز دولة، رقم وطني) إن أمكن — لتهيئة النماذج */
export function splitE164(phone: string): { dial: string; national: string } | null {
  if (!phone.startsWith("+")) return null;
  for (const len of [4, 3, 2, 1]) {
    const dial = phone.slice(1, 1 + len);
    if (COUNTRIES.some((c) => c.dial === dial)) return { dial, national: phone.slice(1 + len) };
  }
  return null;
}
