// Seed script: levels + admin user + master password + approved teacher
import pg from "pg";
import crypto from "node:crypto";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// 1) Levels
// ترحيل idempotent للاسم القرآني القديم مع الحفاظ على id والعلاقات المرتبطة به.
await client.query(
  `UPDATE levels
   SET name = 'النماء'
   WHERE path = 'quran'
     AND name = 'الزرع'
     AND NOT EXISTS (
       SELECT 1 FROM levels
       WHERE path = 'quran' AND name = 'النماء'
     )`,
);
const LEVELS = [
  ["الغرس", "quran", 1, 30, 6, 24],
  ["السنبلة", "quran", 2, 30, 6, 24],
  ["النماء", "quran", 3, 30, 6, 24],
  ["الثمرة", "quran", 4, 30, 6, 24],
  ["الوارثون", "quran", 5, 30, 6, 24],
  ["تصحيح التلاوة", "tajweed_correction", 1, 0, 0, 12],
  ["إجازة حفص", "qiraat", 1, 0, 0, 40],
  ["التجويد الأساسي", "tajweed", 1, 0, 0, 10],
  ["التجويد المتوسط", "tajweed", 2, 0, 0, 10],
  ["التجويد المتقدم", "tajweed", 3, 0, 0, 10],
  ["إتقان التجويد", "tajweed", 4, 0, 0, 10],
];
for (const [name, path, orderIndex, requiredJuz, sessionsCount, requiredSessions] of LEVELS) {
  await client.query(
    `INSERT INTO levels (name, path, order_index, required_juz, sessions_count, required_sessions, is_active)
     SELECT $1::varchar,$2::varchar,$3::int,$4::int,$5::int,$6::int,true
     WHERE NOT EXISTS (SELECT 1 FROM levels WHERE name = $1::varchar AND path = $2::varchar)`,
    [name, path, orderIndex, requiredJuz, sessionsCount, requiredSessions],
  );
}
// ترحيل idempotent لترتيب مستويات القرآن — يحافظ على IDs وجميع العلاقات المرتبطة بالطلاب
await client.query(
  `UPDATE levels
   SET order_index = CASE name
     WHEN 'الغرس' THEN 1
     WHEN 'السنبلة' THEN 2
     WHEN 'النماء' THEN 3
     WHEN 'الثمرة' THEN 4
     WHEN 'الوارثون' THEN 5
   END
   WHERE path = 'quran'
     AND name IN ('الغرس', 'السنبلة', 'النماء', 'الثمرة', 'الوارثون')`,
);
// ترحيل idempotent: إعادة تسمية الصفوف القديمة إن وُجدت (ON CONFLICT DO NOTHING لا يغطيها)
const TAJWEED_RENAMES = [
  ["أحكام النون الساكنة", "التجويد الأساسي"],
  ["المدود وأنواعها", "التجويد المتوسط"],
  ["المخارج والصفات", "التجويد المتقدم"],
  ["الوقف والابتداء", "إتقان التجويد"],
];
for (const [oldName, newName] of TAJWEED_RENAMES) {
  await client.query("UPDATE levels SET name = $1 WHERE name = $2 AND path = 'tajweed'", [newName, oldName]);
}

// 1b) الدروس الشرعية — البنية الافتراضية: العقيدة 5 مستويات (متطلبات المستويات القرآنية الخمسة)،
// الفقه مستوى واحد، السيرة مستوى واحد («مستوى النبلاء» — كتابه الرحيق المختوم).
// كلها قابلة للإدارة الكاملة من لوحة الإدارة (إضافة/حذف/تسمية/ترتيب/تفعيل/إخفاء) — لا شيء ثابت في الكود.
const SHARIA_SUBJECT_KEYS = ["aqeedah", "fiqh", "seerah"];
const SHARIA_LEVEL_NAMES = {
  aqeedah: [
    "منظومة تلقين العقيدة",
    "منظومة البيضاء",
    "الأصول الثلاثة",
    "سلم الوصول إلى علم الأصول — الجزء الأول",
    "سلم الوصول إلى علم الأصول — الجزء الثاني",
  ],
  fiqh: ["الوجيز في الفقه"],
  seerah: ["الرحيق المختوم"],
};
// ترحيل idempotent: توحيد عناوين الكتب/المستويات مع التسميات المعتمدة
await client.query("UPDATE levels SET name = 'منظومة تلقين العقيدة' WHERE path = 'sharia' AND name = 'تلقين العقيدة'");
await client.query("UPDATE books SET title = 'منظومة تلقين العقيدة' WHERE title = 'تلقين العقيدة'");
await client.query("UPDATE levels SET name = 'الرحيق المختوم' WHERE path = 'sharia' AND name_en = 'seerah' AND name = 'مستوى النبلاء'");
// ترحيل قديم: المستويات المفردة بلا name_en (العقيدة/الفقه/السيرة) → المستوى الأول للمادة
const SHARIA_LEGACY_RENAMES = [["العقيدة", "aqeedah"], ["الفقه", "fiqh"], ["السيرة", "seerah"]];
for (const [oldName, key] of SHARIA_LEGACY_RENAMES) {
  await client.query(
    `UPDATE levels SET name = $1, name_en = $2, order_index = 1
     WHERE id = (SELECT id FROM levels WHERE name = $3 AND path = 'sharia' AND (name_en IS NULL OR name_en = '') ORDER BY id LIMIT 1)
       AND NOT EXISTS (SELECT 1 FROM levels WHERE path = 'sharia' AND name_en = $2 AND order_index = 1)`,
    [SHARIA_LEVEL_NAMES[key][0], key, oldName],
  );
}
// توحيد اسم مستوى الفقه الافتراضي مع الكتاب المعتمد — idempotent
await client.query(
  `UPDATE levels SET name = 'الوجيز في الفقه'
   WHERE path = 'sharia' AND name_en = 'fiqh' AND order_index = 1
     AND name IN ('الفقه', 'فقه العبادات', 'منظومة القواعد الفقهية')`,
);
await client.query("UPDATE books SET title = 'الوجيز في الفقه' WHERE title = 'منظومة القواعد الفقهية'");
// تنظيف idempotent: بقايا شرعية بلا name_en ولا مراجع لها تُحذف — لا بيانات مكررة
await client.query(
  `DELETE FROM levels l WHERE l.path = 'sharia' AND (l.name_en IS NULL OR l.name_en = '')
    AND NOT EXISTS (SELECT 1 FROM sharia_content c WHERE c.level_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM student_progress p WHERE p.level_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.level_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM assessments a WHERE a.level_id = l.id)`,
);
// ترحيل المراحل القديمة (البذرة/النور/الهدى/اليقين): العقيدة تُعاد تسميتها إلى المستويات الأربعة الأولى،
// والفقه والسيرة تُدمج مراحلها 2-4 في المستوى الأول ثم تُحذف (أو تُخفى إن كانت مرجعاً لبيانات أخرى)
const OLD_STAGE_NAMES = ["البذرة", "النور", "الهدى", "اليقين"];
for (const key of SHARIA_SUBJECT_KEYS) {
  const targetNames = SHARIA_LEVEL_NAMES[key];
  for (let i = 0; i < OLD_STAGE_NAMES.length; i++) {
    const stageRow = await client.query(
      "SELECT id FROM levels WHERE path='sharia' AND name_en=$1 AND name=$2 ORDER BY id LIMIT 1",
      [key, OLD_STAGE_NAMES[i]],
    );
    const stageId = stageRow.rows[0]?.id;
    if (!stageId) continue;
    if (i < targetNames.length) {
      // إعادة تسمية بالمعرّف نفسه — المحتوى والتقدم والاختبارات المرتبطة تبقى كما هي
      await client.query("UPDATE levels SET name=$1, order_index=$2 WHERE id=$3", [targetNames[i], i + 1, stageId]);
    } else {
      const firstId = (
        await client.query("SELECT id FROM levels WHERE path='sharia' AND name_en=$1 AND order_index=1 ORDER BY id LIMIT 1", [key])
      ).rows[0]?.id;
      if (!firstId) continue;
      await client.query("UPDATE sharia_content SET level_id=$1 WHERE level_id=$2", [firstId, stageId]);
      const refs = await client.query(
        `SELECT (SELECT COUNT(*) FROM student_progress WHERE level_id=$1)
              + (SELECT COUNT(*) FROM sessions WHERE level_id=$1)
              + (SELECT COUNT(*) FROM assessments WHERE level_id=$1) AS n`,
        [stageId],
      );
      if (Number(refs.rows[0].n) === 0) {
        await client.query("DELETE FROM levels WHERE id=$1", [stageId]);
      } else {
        await client.query("UPDATE levels SET is_active=false, is_hidden=true WHERE id=$1", [stageId]);
      }
    }
  }
}
// فصل المسارين: منهج العقيدة الإلزامي المرتبط بالقرآن ينتقل إلى name_en='aqeedah_quran'،
// ويُفسح name_en='aqeedah' لمسار العقيدة الاختياري الجديد في الدروس الشرعية (خمسة مستويات).
// يعمل بعد كل ترحيلات الأسماء القديمة أعلاه حتى يلتقط أي صفوف أعيدت تسميتها إلى أسماء الكتب الإلزامية.
await client.query(
  `UPDATE levels SET name_en = 'aqeedah_quran'
   WHERE path = 'sharia' AND name_en = 'aqeedah' AND name = ANY($1::varchar[])`,
  [SHARIA_LEVEL_NAMES.aqeedah],
);
// إنشاء المستويات الافتراضية الناقصة (مثل الجزء الثاني من سلم الوصول) — idempotent بالمادة+الترتيب
// الفرع الإلزامي للعقيدة يُنشأ بـ name_en='aqeedah_quran' (منفصل تماماً عن المسار الاختياري)
for (const key of SHARIA_SUBJECT_KEYS) {
  const names = SHARIA_LEVEL_NAMES[key];
  const nameEn = key === "aqeedah" ? "aqeedah_quran" : key;
  for (let i = 0; i < names.length; i++) {
    await client.query(
      `INSERT INTO levels (name, name_en, path, order_index, required_juz, sessions_count, required_sessions, is_active)
       SELECT $1::varchar,$2::varchar,'sharia',$3::int,0,0,12,true
       WHERE NOT EXISTS (SELECT 1 FROM levels WHERE path='sharia' AND name_en=$2::varchar AND order_index=$3::int)`,
      [names[i], nameEn, i + 1],
    );
  }
}
// مسار العقيدة الاختياري (الدروس الشرعية): خمسة مستويات افتراضية — قابلة للإدارة الكاملة من لوحة الإدارة
const OPTIONAL_AQEEDAH_LEVELS = ["ثلاثة الأصول", "القواعد الأربع", "العقيدة الواسطية", "كتاب التوحيد", "كشف الشبهات"];
for (let i = 0; i < OPTIONAL_AQEEDAH_LEVELS.length; i++) {
  await client.query(
    `INSERT INTO levels (name, name_en, path, order_index, required_juz, sessions_count, required_sessions, is_active)
     SELECT $1::varchar,'aqeedah','sharia',$2::int,0,0,12,true
     WHERE NOT EXISTS (SELECT 1 FROM levels WHERE path='sharia' AND name_en='aqeedah' AND order_index=$2::int)`,
    [OPTIONAL_AQEEDAH_LEVELS[i], i + 1],
  );
}
// مواد الدروس الشرعية — تُدار (إضافة/تعديل/حذف/ترتيب) من لوحة الإدارة
const SHARIA_SUBJECT_ROWS = [
  ["aqeedah", "العقيدة", "توحيد الله وأركان الإيمان — مسار اختياري بخمسة مستويات", "star", "#B8860B", 1],
  ["fiqh", "الفقه", "أحكام العبادات والمعاملات على قول جمهور أهل العلم — الكتاب المعتمد: الوجيز في الفقه", "scale", "#800020", 2],
  ["seerah", "السيرة النبوية", "السيرة النبوية المطهرة من المولد إلى الوفاة", "books", "#2F6B3A", 3],
];
for (const [key, name, description, icon, color, ord] of SHARIA_SUBJECT_ROWS) {
  await client.query(
    `INSERT INTO sharia_subjects (id, key, name, description, icon, color, order_index, is_active)
     SELECT gen_random_uuid()::text, $1::varchar, $2::varchar, $3, $4::varchar, $5::varchar, $6::int, true
     WHERE NOT EXISTS (SELECT 1 FROM sharia_subjects WHERE key = $1::varchar)`,
    [key, name, description, icon, color, ord],
  );
}
// الجزء الخامس: ربط كل مستوى قرآني بمتطلب العقيدة الإلزامي (الترتيب نفسه 1↔1 … 5↔5)
// الغرس←تلقين العقيدة، السنبلة←منظومة البيضاء، النماء←الأصول الثلاثة، الثمرة←سلم الوصول ج1، الوارثون←سلم الوصول ج2
await client.query(
  `UPDATE levels q SET aqeedah_level_id = a.id
   FROM levels a
   WHERE q.path='quran' AND a.path='sharia' AND a.name_en='aqeedah_quran' AND a.order_index = q.order_index`,
);

// 1c) محتوى الدروس الشرعية — العقيدة موزعة على مستوياتها الخمسة، والفقه والسيرة مدموجة في مستوى واحد لكل منهما
const SHARIA_CONTENT = {
  aqeedah_quran: [
    [
      ["معنى الشهادتين", "مدخل الإسلام الأول", "شهادة أن لا إله إلا الله وأن محمداً رسول الله هي كلمة التوحيد التي يدخل بها العبد الإسلام. فمعنى لا إله إلا الله: لا معبود بحق إلا الله وحده، ومعنى محمد رسول الله: طاعته فيما أمر، وتصديقه فيما أخبر، واجتناب ما نهى عنه وزجر.", 2],
      ["أركان الإيمان الستة", "أصول الاعتقاد", "الإيمان قول وعمل يزيد وينقص، وأركانه ستة جاءت في حديث جبريل عليه السلام: أن تؤمن بالله وملائكته وكتبه ورسله واليوم الآخر، وتؤمن بالقدر خيره وشره.", 2],
      ["أركان الإسلام الخمسة", "بنية الدين", "بُني الإسلام على خمس: شهادة أن لا إله إلا الله وأن محمداً رسول الله، وإقام الصلاة، وإيتاء الزكاة، وصوم رمضان، وحج البيت لمن استطاع إليه سبيلاً.", 2],
    ],
    [
      ["الإيمان بالملائكة", "الركن الثاني", "الملائكة عباد مكرمون خلقهم الله من نور، لا يعصون الله ما أمرهم ويفعلون ما يؤمرون، ومنهم جبريل الأمين على الوحي، وميكائيل الموكل بالقطر، وإسرافيل الموكل بالنفخ في الصور.", 2],
      ["الإيمان بالكتب", "الركن الثالث", "نؤمن بأن الله أنزل كتباً على رسله هدى للناس: التوراة والإنجيل والزبور، وأن القرآن الكريم هو الخاتم المهيمن عليها جميعاً، المحفوظ من التحريف والتبديل إلى يوم الدين.", 2],
      ["الإيمان بالرسل", "الركن الرابع", "أرسل الله رسلاً مبشرين ومنذرين، أولهم نوح وخاتمهم محمد صلى الله عليه وسلم، ومن أولي العزم من الرسل: نوح وإبراهيم وموسى وعيسى ومحمد عليهم الصلاة والسلام.", 2],
    ],
    [
      ["الإيمان باليوم الآخر", "الركن الخامس", "اليوم الآخر هو يوم القيامة التي تُبعث فيه الخلائق للحساب والجزاء، ومن الإيمان به: الإيمان بالموت وعذاب القبر ونعيمه، والبعث والحشر والميزان والصراط والجنة والنار.", 3],
      ["الإيمان بالقدر", "الركن السادس", "الإيمان بالقدر: أن تؤمن بأن الله علم كل شيء وكتبه وشاءه وخلقه، فما شاء الله كان وما لم يشأ لم يكن، مع التوكل على الله والأخذ بالأسباب المشروعة.", 3],
      ["فضل التوحيد وثمراته", "غاية الدعوة", "التوحيد أعظم ما جاءت به الرسل، وهو سراج القلب وطمأنينة النفس، به تُدخل الجنة ويُفاز برضوان الله، وهو شرط في قبول الأعمال ورفعها.", 2],
    ],
    [
      ["التوحيد وأقسامه", "إفراد الله بالعبادة", "التوحيد ثلاثة أقسام: توحيد الربوبية وهو إفراد الله بالخلق والملك والتدبير، وتوحيد الألوهية وهو إفراده بالعبادة، وتوحيد الأسماء والصفات وهو إثبات ما أثبته الله لنفسه من غير تحريف ولا تعطيل.", 3],
      ["الشرك وأنواعه", "أعظم الذنوب", "الشرك أكبر ذنب يُعصى الله به، وهو صرف شيء من العبادة لغير الله. منه الأكبر كعبادة الأصنام، والأصغر كالرياء، وعلى المسلم معرفة طرقه ليجتنبها.", 3],
      ["نواقض الإيمان", "ما يفسد العقيدة", "الإيمان يزيد بالطاعة وينقص بالمعصية، وله نواقض تخرج من الملة كالشرك الأكبر والسخرية بالدين، فعلى المسلم أن يتعلم ما يصحح به اعتقاده ويحذر ما يناقضه.", 2],
    ],
    [
      ["الحكم التكليفي وأقسامه", "مدخل أصول الفقه", "الحكم التكليفي خطاب الله المتعلق بأفعال المكلفين اقتضاءً أو تخييراً، وأقسامه خمسة: الواجب والمندوب والمحرم والمكروه والمباح، وعلى المكلف معرفتها ليعبد الله على بصيرة.", 2],
      ["الكتاب والسنة وأدلة الاستنباط", "مصادر التشريع", "أدلة الأحكام الأصلية: الكتاب والسنة والإجماع والقياس، ومن أصول الفقه معرفة دلالة الألفاظ على الأحكام ومراتب الأدلة عند التعارض.", 2],
      ["شروط المجتهد ومراتب الفقهاء", "باب الاجتهاد", "الاجتهاد بذل الجهد في استنباط الأحكام من أدلتها، وله شروط لا يبلغها إلا من جمع أدوات العلم من لغة وقرآن وسنة وأصول، وهذا مما يُفصَّل في الجزء الثاني من متن سلم الوصول لحافظ الحكمي.", 2],
    ],
  ],
  fiqh: [
    [
      ["الطهارة وأحكامها", "مفتاح الصلاة", "الطهارة شرط لصحة الصلاة، وتكون بالوضوء عن الحدث الأصغر وبالغسل عن الحدث الأكبر، ومن محاسن الإسلام رفع الحرج بالتيمم عند فقد الماء أو العجز عن استعماله.", 3],
      ["الوضوء ونواقضه", "صفة الوضوء", "فرائض الوضوء ستة: غسل الوجه ومنه المضمضة والاستنشاق، وغسل اليدين إلى المرفقين، ومسح الرأس والأذنين، وغسل الرجلين، والترتيب، والموالاة. وينتقض بالخارج من السبيلين والنوم المستغرق ونحوه.", 3],
      ["الصلاة وأركانها", "عمود الدين", "الصلاة أعظم أركان الإسلام بعد الشهادتين، فرضها الله خمساً في اليوم والليلة، وأركانها: تكبيرة الإحرام والقيام وقراءة الفاتحة والركوع والسجود والتشهد الأخير والترتيب.", 3],
    ],
    [
      ["الزكاة ومصارفها", "الركن الثالث", "الزكاة حق واجب في المال إذا بلغ النصاب وحال عليه الحول، ومصارفها ثمانية بينها الله في سورة التوبة، منها الفقراء والمساكين والعاملون عليها وفي الرقاب.", 2],
      ["الصيام ومبطلاته", "ركن وسراج", "صيام رمضان فرض على كل مسلم بالغ عاقل قادر، وهو الإمساك عن المفطرات من طلوع الفجر إلى غروب الشمس، ومن مبطلاته الأكل والشرب عمداً بلا عذر شرعي.", 2],
      ["الحج والعمرة", "رحلة العمر", "الحج الركن الخامس فرض مرة في العمر لمن استطاع إليه سبيلاً، وأركانه: الإحرام والوقوف بعرفة وطواف الإفاضة والسعي بين الصفا والمروة.", 3],
    ],
    [
      ["أحكام البيوع", "فقه المعاملات", "أحل الله البيع وحرم الربا، ومن شروط صحة البيع التراضي وتعيين المبيع والقدرة على التسليم، ومن المحرمات: بيع الغرر والربا بأنواعه والغش والتدليس.", 3],
      ["الأطعمة والأشربة", "الحلال الطيب", "الأصل في الأطعمة الحل إلا ما نص الشرع على تحريمه كالميتة والدم ولحم الخنزير وما أُهل لغير الله به، وتُشترط الذكاة الشرعية فيما يُذبح.", 2],
      ["آداب الطعام والشراب", "سنن وآداب", "من آداب الطعام: التسمية والأكل باليمين ومما يلي، وعدم النفخ في الطعام والشراب، ومن السنة إظهار الرضا وعدم عيب الطعام.", 2],
    ],
    [
      ["أحكام النكاح", "ميثاق غليظ", "النكاح سنة المرسلين وفيه حفظ الأعراض والأنساب، وأركانه: الإيجاب والقبول، وشروطه: الولي والشهود والرضا، وقد قال صلى الله عليه وسلم: يا معشر الشباب من استطاع منكم الباءة فليتزوج.", 3],
      ["أحكام المواريث", "علم الفرائض", "المواريث قسمة الله العادلة بين الورثة، والفرائض المقدرة في القرآن: النصف والربع والثمن والثلثان والثلث والسدس، ويُبدأ بالوصية والدين قبل القسمة.", 3],
      ["أحكام الجنايات", "حفظ الدماء", "حرم الله الاعتداء على النفوس والأموال والأعراض، وجعل لكل جناية حكماً شرعياً من قصاص أو دية أو تعزير، ردعاً للمعتدي وحقناً للدماء.", 2],
    ],
  ],
  seerah: [
    [
      ["مولد النبي ﷺ ونشأته", "عام الفيل", "ولد النبي صلى الله عليه وسلم في مكة عام الفيل يتيم الأب، وكفلته أمه آمنة ثم جده عبد المطلب ثم عمه أبو طالب، وعُرف منذ صغره بالصدق والأمانة حتى لقبه قومه بالأمين.", 2],
      ["مكة قبل البعثة", "أحوال الجاهلية", "كانت العرب قبل الإسلام في جاهلية: شرك وعبادة أصنام ووأد للبنات وثارات، وكان فيهم مكارم كالكرم والوفاء، حتى جاء الإسلام فأبقى المحاسن وأزال الرذائل.", 2],
      ["غار حراء ورياض النفس", "الاستعداد للوحي", "كان صلى الله عليه وسلم يخلو بنفسه في غار حراء يتعبد ويتفكر في خلق السماوات والأرض، حتى نزل عليه الوحي وهو في الأربعين من عمره.", 2],
    ],
    [
      ["بدء الوحي والدعوة السرية", "اقرأ", "نزل جبريل على النبي صلى الله عليه وسلم في غار حراء بقوله تعالى: اقرأ باسم ربك الذي خلق، فكانت أولى آيات القرآن نزولاً، وبدأت الدعوة سراً فآمن به أبو بكر وعلي وخديجة وزيد رضي الله عنهم.", 2],
      ["الجهر بالدعوة وصبر المسلمين", "سنوات الابتلاء", "بعد ثلاث سنين أمره الله بالجهر فصدع بما أُمر، فآذته قريش وآذت أصحابه، فصبر المسلمون وهاجر بعضهم إلى الحبشة فراراً بدينهم.", 3],
      ["الهجرة إلى المدينة", "فجر الدولة", "بعد بيعة العقبة أذن الله للمسلمين بالهجرة، فهاجر صلى الله عليه وسلم مع أبي بكر إلى المدينة فاستقبله الأنصار، فأسس المسجد وآخى بين المهاجرين والأنصار.", 3],
    ],
    [
      ["غزوة بدر الكبرى", "يوم الفرقان", "في السنة الثانية للهجرة التقى المسلمون ثلاثمائة وثلاثة عشر رجلاً بجيش قريش الألف في بدر، فنصر الله المؤمنين نصراً مؤزراً وكان يوماً فرق فيه بين الحق والباطل.", 3],
      ["أُحد والخندق", "دروس الصبر والثبات", "في أُحد ابتلى الله المؤمنين بمخالفة الرماة فكانت الدائرة عليهم ثم ثابوا إلى الله، وفي الخندق حفر المسلمون خندقاً حول المدينة فرد الله الأحزاب بغير قتال حاسم.", 3],
      ["صلح الحديبية", "الفتح المبين", "في السنة السادسة صالح النبي صلى الله عليه وسلم قريشاً على شروط ظاهرها الجفاء وباطنها النصر، فسمى الله صلحها فتحاً مبيناً، ودخل الناس في دين الله أفواجاً.", 2],
    ],
    [
      ["فتح مكة", "يوم الرحمة", "في السنة الثامنة دخل صلى الله عليه وسلم مكة في عشرة آلاف مقاتل فاتحاً، وأعلن العفو العام قائلاً: اذهبوا فأنتم الطلقاء، فدخلت قريش في الإسلام وعاد البيت الحرام للتوحيد.", 3],
      ["حجة الوداع", "تتمة الدين", "في السنة العاشرة حج صلى الله عليه وسلم حجة الوداع وخطب في الناس خطبة البلاغ، وأنزل الله: اليوم أكملت لكم دينكم وأتممت عليكم نعمتي ورضيت لكم الإسلام ديناً.", 2],
      ["وفاة النبي ﷺ وخلافة أبي بكر", "الثبات بعد الرحيل", "توفي صلى الله عليه وسلم في السنة الحادية عشرة فكانت مصيبة الأمة الكبرى، فاجتمعت الكلمة على خلافة أبي بكر الصديق الذي قاتل المرتدين وحفظ الدين.", 3],
    ],
  ],
};
// بنية الدرس المقسّمة: أهداف ← محتوى ← ملاحظات ← خلاصة (تُقرأ بواسطة صفحة الدرس)
const SHARIA_SUBJECT_NOTES = {
  aqeedah_quran: ["اضبط المصطلحات الشرعية الواردة في الدرس وفهمها، فهي مفاتيح العقيدة.", "العقيدة الصحيحة أساس قبول العمل — أتقن الدرس قبل الانتقال إلى الذي يليه."],
  fiqh: ["الأحكام المذكورة على قول جمهور أهل العلم، وما فيه خلاف معتبر يُراجع مع شيخ الحلقة.", "طبّق الحكم عملياً فور تعلمه؛ فالفقه يُتقن بالممارسة لا بالقراءة وحدها."],
  seerah: ["اقرأ الأحداث بعين الاعتبار واستخرج من كل موقف هداية عملية لحياتك.", "اربط الحدث بسياقه الزمني والمكاني لتتضح سلسلة السيرة متصلة."],
};
function composeLessonBody(key, title, desc, body) {
  const firstSentence = body.split(".")[0].trim() + ".";
  return [
    "«أهداف الدرس»",
    `• أن يفهم الطالب ${desc} فهماً صحيحاً راسخاً.`,
    `• أن يضبط أهم ما ورد في درس «${title}».`,
    "• أن يستحضر أثر هذا الدرس في سلوكه اليومي.",
    "",
    "«الدرس»",
    body,
    "",
    "«ملاحظات مهمة»",
    ...SHARIA_SUBJECT_NOTES[key].map((n) => `• ${n}`),
    "",
    "«خلاصة الدرس»",
    firstSentence,
  ].join("\n");
}
for (const [key, stages] of Object.entries(SHARIA_CONTENT)) {
  const lvls = await client.query(
    "SELECT id FROM levels WHERE path='sharia' AND name_en=$1 ORDER BY order_index",
    [key],
  );
  const levelIds = lvls.rows.map((r) => r.id);
  if (!levelIds.length) continue;
  const perLevelOrder = new Map();
  for (let s = 0; s < stages.length; s++) {
    // العقيدة: كل مجموعة دروس لمستوى (1..5) — الفقه/السيرة: كل المجموعات في المستوى الوحيد
    const levelId = levelIds[Math.min(s, levelIds.length - 1)];
    for (let i = 0; i < stages[s].length; i++) {
      const [title, desc, body, pages] = stages[s][i];
      const sectioned = composeLessonBody(key, title, desc, body);
      const ord = (perLevelOrder.get(levelId) ?? 0) + 1;
      perLevelOrder.set(levelId, ord);
      await client.query(
        `INSERT INTO sharia_content (id, level_id, title, author, description, content_type, text_body, page_count, order_index, status)
         SELECT gen_random_uuid()::text, $1::int, $2::varchar, 'إعداد فريق تبيان', $3, 'text', $4, $5::int, $6::int, 'published'
         WHERE NOT EXISTS (SELECT 1 FROM sharia_content WHERE level_id = $1::int AND title = $2::varchar)`,
        [levelId, title, desc, sectioned, pages, ord],
      );
      // ترقية idempotent للدروس المزروعة سابقاً إلى البنية المقسّمة + مزامنة الترتيب بعد الدمج
      await client.query(
        `UPDATE sharia_content SET text_body = $3, order_index = $4 WHERE level_id = $1::int AND title = $2::varchar`,
        [levelId, title, sectioned, ord],
      );
    }
  }
}
console.log("sharia levels restructured (aqeedah 5 / fiqh 1 / seerah 1) + content seeded");

// 1d) كتب المتطلبات الافتراضية — تُدار بالكامل من لوحة الإدارة (عنوان/مؤلف/تصنيف/مستوى/غلاف/وصف/PDF/صوت/حالة نشر)
const REQUIREMENT_BOOKS = [
  ["منظومة تلقين العقيدة", "إعداد فريق تبيان", "aqeedah", "aqeedah_quran", 1, "متن العقيدة الميسّر — متطلب مستوى الغرس القرآني الإلزامي."],
  ["منظومة البيضاء", "إعداد فريق تبيان", "aqeedah", "aqeedah_quran", 2, "منظومة البيضاء في العقيدة والسلوك — متطلب مستوى السنبلة الإلزامي."],
  ["الأصول الثلاثة", "الإمام محمد بن عبد الوهاب", "aqeedah", "aqeedah_quran", 3, "متن الأصول الثلاثة وأدلتها — متطلب مستوى النماء الإلزامي."],
  ["سلم الوصول إلى علم الأصول — الجزء الأول", "حافظ بن أحمد الحكمي", "aqeedah", "aqeedah_quran", 4, "الجزء الأول من متن سلم الوصول إلى علم الأصول — متطلب مستوى الثمرة الإلزامي."],
  ["سلم الوصول إلى علم الأصول — الجزء الثاني", "حافظ بن أحمد الحكمي", "aqeedah", "aqeedah_quran", 5, "الجزء الثاني من متن سلم الوصول إلى علم الأصول — متطلب مستوى الوارثون الإلزامي."],
  ["ثلاثة الأصول", "الإمام محمد بن عبد الوهاب", "aqeedah", "aqeedah", 1, "متن الأصول الثلاثة وأدلتها — الكتاب المعتمد للمستوى الأول من مسار العقيدة الاختياري."],
  ["القواعد الأربع", "الإمام محمد بن عبد الوهاب", "aqeedah", "aqeedah", 2, "متن القواعد الأربع — الكتاب المعتمد للمستوى الثاني من مسار العقيدة الاختياري."],
  ["العقيدة الواسطية", "شيخ الإسلام ابن تيمية", "aqeedah", "aqeedah", 3, "متن العقيدة الواسطية — الكتاب المعتمد للمستوى الثالث من مسار العقيدة الاختياري."],
  ["كتاب التوحيد", "الإمام محمد بن عبد الوهاب", "aqeedah", "aqeedah", 4, "كتاب التوحيد الذي هو حق الله على العبيد — الكتاب المعتمد للمستوى الرابع من مسار العقيدة الاختياري."],
  ["الوجيز في الفقه", "الشيخ عبد الرحمن بن ناصر السعدي", "fiqh", "fiqh", 1, "الكتاب المعتمد في الفقه."],
  ["الرحيق المختوم", "صفي الرحمن المباركفوري", "seerah", "seerah", 1, "كتاب السيرة النبوية المعتمد لهذا المستوى."],
];
for (const [title, author, category, key, order, description] of REQUIREMENT_BOOKS) {
  const lvl = await client.query(
    "SELECT id FROM levels WHERE path='sharia' AND name_en=$1 AND order_index=$2",
    [key, order],
  );
  const levelId = lvl.rows[0]?.id;
  if (!levelId) continue;
  await client.query(
    `INSERT INTO books (id, title, author, category, section, content_type, text_content, description, level_ids, status)
     SELECT gen_random_uuid()::text, $1::varchar, $2::varchar, $3::varchar, 'curriculum', 'text', $4, $4, jsonb_build_array($5::int), 'published'
     WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = $1::varchar)`,
    [title, author, category, description, levelId],
  );
  // مزامنة idempotent للصفوف الموجودة: التصنيف + المستوى + الوصف + الحالة
  await client.query(
    `UPDATE books SET category=$2::varchar, level_ids=jsonb_build_array($3::int), description=$4, section='curriculum', status='published' WHERE title=$1::varchar`,
    [title, category, levelId, description],
  );
}
console.log("requirement books seeded (5 aqeedah + fiqh + ar-raheeq al-makhtum)");

// 1e) تحفة الأطفال — كتاب عام مرئي لكل الطلاب في المكتبة؛ يصبح "مقرراً" فقط لمن يختاره في اختبار القبول
// (المستويات 1-4)، وهو متطلب دائم دون اختيار في المستوى الخامس (الوارثون) — التسجيل التلقائي في lib/tabyan-trpc/src/routers/student.ts
await client.query(
  `INSERT INTO books (id, title, author, category, section, content_type, text_content, description, level_ids, status)
   SELECT gen_random_uuid()::text, 'تحفة الأطفال', 'الشيخ سليمان الجمزوري', 'quran', 'general', 'text',
     'متن تحفة الأطفال في التجويد', 'كتاب عام في المكتبة — يصبح مقرراً دراسياً فقط عند اختيار الطالب دراسته أثناء اختبار القبول.',
     NULL, 'published'
   WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'تحفة الأطفال')`,
);
console.log("تحفة الأطفال book seeded");

// 2) Admin user
const adminId = crypto.randomUUID();
await client.query(
  `INSERT INTO users (id, full_name, phone, role, is_active) VALUES ($1,'مشرف تبيان','0500000001','admin',true) ON CONFLICT DO NOTHING`,
  [adminId],
);
const hash = process.env.MASTER_HASH;
if (hash) {
  await client.query(
    `INSERT INTO system_settings (id, key, value) VALUES (gen_random_uuid()::text, 'admin_master_password_hash', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [hash],
  );
} else {
  console.log("MASTER_HASH not set — keeping existing admin master password hash");
}
console.log("admin seeded");

// 3) Approved teacher (idempotent: reuse the existing user id if already seeded)
await client.query(
  `INSERT INTO users (id, full_name, phone, role, is_active) VALUES ($1,'أحمد المالكي','0500000002','teacher',true) ON CONFLICT DO NOTHING`,
  [crypto.randomUUID()],
);
const teacherId = (
  await client.query(`SELECT id FROM users WHERE phone = '0500000002' AND role = 'teacher'`)
).rows[0].id;
await client.query(
  `INSERT INTO teachers (user_id, kyc_status, specialization, experience_years)
   VALUES ($1,'approved','تحفيظ وتجويد',10) ON CONFLICT (user_id) DO NOTHING`,
  [teacherId],
);
await client.query(
  `INSERT INTO teacher_settings (id, teacher_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
  [crypto.randomUUID(), teacherId],
);
console.log("teacher seeded");

// 4) Mufti assignment: make the seeded teacher a mufti for «قراءات» (qiraat)
// fatwaAssign rejects any mufti without an active mufti_assignments row for the
// question's category, so at least one mufti must cover qiraat.
await client.query(
  `UPDATE teachers SET is_mufti = true
   WHERE user_id = (SELECT id FROM users WHERE phone = '0500000002' AND role = 'teacher')`,
);
await client.query(
  `INSERT INTO mufti_assignments (id, teacher_id, category, max_pending_fatwas, is_active)
   SELECT $1, u.id, 'qiraat', 10, true
   FROM users u
   WHERE u.phone = '0500000002' AND u.role = 'teacher'
   ON CONFLICT (teacher_id, category)
   DO UPDATE SET is_active = true, max_pending_fatwas = EXCLUDED.max_pending_fatwas`,
  [crypto.randomUUID()],
);
console.log("qiraat mufti assignment seeded");

const lv = await client.query(`SELECT id, name, name_en, path, order_index, aqeedah_level_id FROM levels ORDER BY path, name_en, order_index`);
console.log(JSON.stringify(lv.rows, null, 1));
await client.end();
