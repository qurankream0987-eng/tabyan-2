// ── مصحف الملك فهد — بيانات الترقيم المدني (٦٠٤ صفحات) ──────────────
// جدول السور القياسي للطبعة المدنية: رقم السورة، الاسم، الاسم بالإنجليزية،
// عدد الآيات، صفحة بداية السورة في المصحف، والجزء الذي تبدأ فيه.

export interface SurahMeta {
  n: number;
  name: string;
  englishName: string;
  ayahs: number;
  startPage: number;
  juz: number;
}

export const TOTAL_PAGES = 604;

export const SURAHS: SurahMeta[] = [
  { n: 1, name: "الفاتحة", englishName: "Al-Fatihah", ayahs: 7, startPage: 1, juz: 1 },
  { n: 2, name: "البقرة", englishName: "Al-Baqarah", ayahs: 286, startPage: 2, juz: 1 },
  { n: 3, name: "آل عمران", englishName: "Ali 'Imran", ayahs: 200, startPage: 50, juz: 3 },
  { n: 4, name: "النساء", englishName: "An-Nisa", ayahs: 176, startPage: 77, juz: 4 },
  { n: 5, name: "المائدة", englishName: "Al-Ma'idah", ayahs: 120, startPage: 106, juz: 6 },
  { n: 6, name: "الأنعام", englishName: "Al-An'am", ayahs: 165, startPage: 128, juz: 7 },
  { n: 7, name: "الأعراف", englishName: "Al-A'raf", ayahs: 206, startPage: 151, juz: 8 },
  { n: 8, name: "الأنفال", englishName: "Al-Anfal", ayahs: 75, startPage: 177, juz: 9 },
  { n: 9, name: "التوبة", englishName: "At-Tawbah", ayahs: 129, startPage: 187, juz: 10 },
  { n: 10, name: "يونس", englishName: "Yunus", ayahs: 109, startPage: 208, juz: 11 },
  { n: 11, name: "هود", englishName: "Hud", ayahs: 123, startPage: 221, juz: 11 },
  { n: 12, name: "يوسف", englishName: "Yusuf", ayahs: 111, startPage: 235, juz: 12 },
  { n: 13, name: "الرعد", englishName: "Ar-Ra'd", ayahs: 43, startPage: 249, juz: 13 },
  { n: 14, name: "إبراهيم", englishName: "Ibrahim", ayahs: 52, startPage: 255, juz: 13 },
  { n: 15, name: "الحجر", englishName: "Al-Hijr", ayahs: 99, startPage: 262, juz: 14 },
  { n: 16, name: "النحل", englishName: "An-Nahl", ayahs: 128, startPage: 267, juz: 14 },
  { n: 17, name: "الإسراء", englishName: "Al-Isra", ayahs: 111, startPage: 282, juz: 15 },
  { n: 18, name: "الكهف", englishName: "Al-Kahf", ayahs: 110, startPage: 293, juz: 15 },
  { n: 19, name: "مريم", englishName: "Maryam", ayahs: 98, startPage: 305, juz: 16 },
  { n: 20, name: "طه", englishName: "Taha", ayahs: 135, startPage: 312, juz: 16 },
  { n: 21, name: "الأنبياء", englishName: "Al-Anbya", ayahs: 112, startPage: 322, juz: 17 },
  { n: 22, name: "الحج", englishName: "Al-Hajj", ayahs: 78, startPage: 332, juz: 17 },
  { n: 23, name: "المؤمنون", englishName: "Al-Mu'minun", ayahs: 118, startPage: 342, juz: 18 },
  { n: 24, name: "النور", englishName: "An-Nur", ayahs: 64, startPage: 350, juz: 18 },
  { n: 25, name: "الفرقان", englishName: "Al-Furqan", ayahs: 77, startPage: 359, juz: 18 },
  { n: 26, name: "الشعراء", englishName: "Ash-Shu'ara", ayahs: 227, startPage: 367, juz: 19 },
  { n: 27, name: "النمل", englishName: "An-Naml", ayahs: 93, startPage: 377, juz: 19 },
  { n: 28, name: "القصص", englishName: "Al-Qasas", ayahs: 88, startPage: 385, juz: 20 },
  { n: 29, name: "العنكبوت", englishName: "Al-'Ankabut", ayahs: 69, startPage: 396, juz: 20 },
  { n: 30, name: "الروم", englishName: "Ar-Rum", ayahs: 60, startPage: 404, juz: 21 },
  { n: 31, name: "لقمان", englishName: "Luqman", ayahs: 34, startPage: 411, juz: 21 },
  { n: 32, name: "السجدة", englishName: "As-Sajdah", ayahs: 30, startPage: 415, juz: 21 },
  { n: 33, name: "الأحزاب", englishName: "Al-Ahzab", ayahs: 73, startPage: 418, juz: 21 },
  { n: 34, name: "سبأ", englishName: "Saba", ayahs: 54, startPage: 428, juz: 22 },
  { n: 35, name: "فاطر", englishName: "Fatir", ayahs: 45, startPage: 434, juz: 22 },
  { n: 36, name: "يس", englishName: "Ya-Sin", ayahs: 83, startPage: 440, juz: 22 },
  { n: 37, name: "الصافات", englishName: "As-Saffat", ayahs: 182, startPage: 446, juz: 23 },
  { n: 38, name: "ص", englishName: "Sad", ayahs: 88, startPage: 453, juz: 23 },
  { n: 39, name: "الزمر", englishName: "Az-Zumar", ayahs: 75, startPage: 458, juz: 23 },
  { n: 40, name: "غافر", englishName: "Ghafir", ayahs: 85, startPage: 467, juz: 24 },
  { n: 41, name: "فصلت", englishName: "Fussilat", ayahs: 54, startPage: 477, juz: 24 },
  { n: 42, name: "الشورى", englishName: "Ash-Shuraa", ayahs: 53, startPage: 483, juz: 25 },
  { n: 43, name: "الزخرف", englishName: "Az-Zukhruf", ayahs: 89, startPage: 489, juz: 25 },
  { n: 44, name: "الدخان", englishName: "Ad-Dukhan", ayahs: 59, startPage: 496, juz: 25 },
  { n: 45, name: "الجاثية", englishName: "Al-Jathiyah", ayahs: 37, startPage: 499, juz: 25 },
  { n: 46, name: "الأحقاف", englishName: "Al-Ahqaf", ayahs: 35, startPage: 502, juz: 26 },
  { n: 47, name: "محمد", englishName: "Muhammad", ayahs: 38, startPage: 507, juz: 26 },
  { n: 48, name: "الفتح", englishName: "Al-Fath", ayahs: 29, startPage: 511, juz: 26 },
  { n: 49, name: "الحجرات", englishName: "Al-Hujurat", ayahs: 18, startPage: 515, juz: 26 },
  { n: 50, name: "ق", englishName: "Qaf", ayahs: 45, startPage: 518, juz: 26 },
  { n: 51, name: "الذاريات", englishName: "Adh-Dhariyat", ayahs: 60, startPage: 520, juz: 26 },
  { n: 52, name: "الطور", englishName: "At-Tur", ayahs: 49, startPage: 523, juz: 27 },
  { n: 53, name: "النجم", englishName: "An-Najm", ayahs: 62, startPage: 526, juz: 27 },
  { n: 54, name: "القمر", englishName: "Al-Qamar", ayahs: 55, startPage: 528, juz: 27 },
  { n: 55, name: "الرحمن", englishName: "Ar-Rahman", ayahs: 78, startPage: 531, juz: 27 },
  { n: 56, name: "الواقعة", englishName: "Al-Waqi'ah", ayahs: 96, startPage: 534, juz: 27 },
  { n: 57, name: "الحديد", englishName: "Al-Hadid", ayahs: 29, startPage: 537, juz: 27 },
  { n: 58, name: "المجادلة", englishName: "Al-Mujadila", ayahs: 22, startPage: 542, juz: 28 },
  { n: 59, name: "الحشر", englishName: "Al-Hashr", ayahs: 24, startPage: 545, juz: 28 },
  { n: 60, name: "الممتحنة", englishName: "Al-Mumtahanah", ayahs: 13, startPage: 549, juz: 28 },
  { n: 61, name: "الصف", englishName: "As-Saff", ayahs: 14, startPage: 551, juz: 28 },
  { n: 62, name: "الجمعة", englishName: "Al-Jumu'ah", ayahs: 11, startPage: 553, juz: 28 },
  { n: 63, name: "المنافقون", englishName: "Al-Munafiqun", ayahs: 11, startPage: 554, juz: 28 },
  { n: 64, name: "التغابن", englishName: "At-Taghabun", ayahs: 18, startPage: 556, juz: 28 },
  { n: 65, name: "الطلاق", englishName: "At-Talaq", ayahs: 12, startPage: 558, juz: 28 },
  { n: 66, name: "التحريم", englishName: "At-Tahrim", ayahs: 12, startPage: 560, juz: 28 },
  { n: 67, name: "الملك", englishName: "Al-Mulk", ayahs: 30, startPage: 562, juz: 29 },
  { n: 68, name: "القلم", englishName: "Al-Qalam", ayahs: 52, startPage: 564, juz: 29 },
  { n: 69, name: "الحاقة", englishName: "Al-Haqqah", ayahs: 52, startPage: 566, juz: 29 },
  { n: 70, name: "المعارج", englishName: "Al-Ma'arij", ayahs: 44, startPage: 568, juz: 29 },
  { n: 71, name: "نوح", englishName: "Nuh", ayahs: 28, startPage: 570, juz: 29 },
  { n: 72, name: "الجن", englishName: "Al-Jinn", ayahs: 28, startPage: 572, juz: 29 },
  { n: 73, name: "المزمل", englishName: "Al-Muzzammil", ayahs: 20, startPage: 574, juz: 29 },
  { n: 74, name: "المدثر", englishName: "Al-Muddaththir", ayahs: 56, startPage: 575, juz: 29 },
  { n: 75, name: "القيامة", englishName: "Al-Qiyamah", ayahs: 40, startPage: 577, juz: 29 },
  { n: 76, name: "الإنسان", englishName: "Al-Insan", ayahs: 31, startPage: 578, juz: 29 },
  { n: 77, name: "المرسلات", englishName: "Al-Mursalat", ayahs: 50, startPage: 580, juz: 29 },
  { n: 78, name: "النبأ", englishName: "An-Naba", ayahs: 40, startPage: 582, juz: 30 },
  { n: 79, name: "النازعات", englishName: "An-Nazi'at", ayahs: 46, startPage: 583, juz: 30 },
  { n: 80, name: "عبس", englishName: "'Abasa", ayahs: 42, startPage: 585, juz: 30 },
  { n: 81, name: "التكوير", englishName: "At-Takwir", ayahs: 29, startPage: 586, juz: 30 },
  { n: 82, name: "الانفطار", englishName: "Al-Infitar", ayahs: 19, startPage: 587, juz: 30 },
  { n: 83, name: "المطففين", englishName: "Al-Mutaffifin", ayahs: 36, startPage: 587, juz: 30 },
  { n: 84, name: "الانشقاق", englishName: "Al-Inshiqaq", ayahs: 25, startPage: 589, juz: 30 },
  { n: 85, name: "البروج", englishName: "Al-Buruj", ayahs: 22, startPage: 590, juz: 30 },
  { n: 86, name: "الطارق", englishName: "At-Tariq", ayahs: 17, startPage: 591, juz: 30 },
  { n: 87, name: "الأعلى", englishName: "Al-A'la", ayahs: 19, startPage: 591, juz: 30 },
  { n: 88, name: "الغاشية", englishName: "Al-Ghashiyah", ayahs: 26, startPage: 592, juz: 30 },
  { n: 89, name: "الفجر", englishName: "Al-Fajr", ayahs: 30, startPage: 593, juz: 30 },
  { n: 90, name: "البلد", englishName: "Al-Balad", ayahs: 20, startPage: 594, juz: 30 },
  { n: 91, name: "الشمس", englishName: "Ash-Shams", ayahs: 15, startPage: 595, juz: 30 },
  { n: 92, name: "الليل", englishName: "Al-Layl", ayahs: 21, startPage: 595, juz: 30 },
  { n: 93, name: "الضحى", englishName: "Ad-Duhaa", ayahs: 11, startPage: 596, juz: 30 },
  { n: 94, name: "الشرح", englishName: "Ash-Sharh", ayahs: 8, startPage: 596, juz: 30 },
  { n: 95, name: "التين", englishName: "At-Tin", ayahs: 8, startPage: 597, juz: 30 },
  { n: 96, name: "العلق", englishName: "Al-'Alaq", ayahs: 19, startPage: 597, juz: 30 },
  { n: 97, name: "القدر", englishName: "Al-Qadr", ayahs: 5, startPage: 598, juz: 30 },
  { n: 98, name: "البينة", englishName: "Al-Bayyinah", ayahs: 8, startPage: 598, juz: 30 },
  { n: 99, name: "الزلزلة", englishName: "Az-Zalzalah", ayahs: 8, startPage: 599, juz: 30 },
  { n: 100, name: "العاديات", englishName: "Al-'Adiyat", ayahs: 11, startPage: 599, juz: 30 },
  { n: 101, name: "القارعة", englishName: "Al-Qari'ah", ayahs: 11, startPage: 600, juz: 30 },
  { n: 102, name: "التكاثر", englishName: "At-Takathur", ayahs: 8, startPage: 600, juz: 30 },
  { n: 103, name: "العصر", englishName: "Al-'Asr", ayahs: 3, startPage: 601, juz: 30 },
  { n: 104, name: "الهمزة", englishName: "Al-Humazah", ayahs: 9, startPage: 601, juz: 30 },
  { n: 105, name: "الفيل", englishName: "Al-Fil", ayahs: 5, startPage: 601, juz: 30 },
  { n: 106, name: "قريش", englishName: "Quraysh", ayahs: 4, startPage: 602, juz: 30 },
  { n: 107, name: "الماعون", englishName: "Al-Ma'un", ayahs: 7, startPage: 602, juz: 30 },
  { n: 108, name: "الكوثر", englishName: "Al-Kawthar", ayahs: 3, startPage: 602, juz: 30 },
  { n: 109, name: "الكافرون", englishName: "Al-Kafirun", ayahs: 6, startPage: 603, juz: 30 },
  { n: 110, name: "النصر", englishName: "An-Nasr", ayahs: 3, startPage: 603, juz: 30 },
  { n: 111, name: "المسد", englishName: "Al-Masad", ayahs: 5, startPage: 603, juz: 30 },
  { n: 112, name: "الإخلاص", englishName: "Al-Ikhlas", ayahs: 4, startPage: 604, juz: 30 },
  { n: 113, name: "الفلق", englishName: "Al-Falaq", ayahs: 5, startPage: 604, juz: 30 },
  { n: 114, name: "الناس", englishName: "An-Nas", ayahs: 6, startPage: 604, juz: 30 },
];

export interface JuzMeta {
  n: number;
  name: string;
  startPage: number;
}

const JUZ_NAMES = [
  "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن",
  "التاسع", "العاشر", "الحادي عشر", "الثاني عشر", "الثالث عشر", "الرابع عشر",
  "الخامس عشر", "السادس عشر", "السابع عشر", "الثامن عشر", "التاسع عشر", "العشرون",
  "الحادي والعشرون", "الثاني والعشرون", "الثالث والعشرون", "الرابع والعشرون",
  "الخامس والعشرون", "السادس والعشرون", "السابع والعشرون", "الثامن والعشرون",
  "التاسع والعشرون", "الثلاثون",
];

const JUZ_START_PAGES = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282, 302,
  322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
];

export const JUZ_LIST: JuzMeta[] = JUZ_NAMES.map((name, i) => ({
  n: i + 1,
  name: `الجزء ${name}`,
  startPage: JUZ_START_PAGES[i],
}));
