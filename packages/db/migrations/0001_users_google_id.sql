-- ترحيل آمن وإديمبوتنت (idempotent) لإضافة ربط Google لحسابات الطلاب.
-- لا يحذف ولا يعدّل أي بيانات موجودة: العمود nullable ولا قيمة افتراضية له.
-- مطبَّق فعلياً على قاعدة التطوير بتاريخ 2026-08-13، وهذا الملف هو المسار المتتبَّع لتطبيقه على الإنتاج.

ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id varchar(255);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_google_id_unique') THEN
    ALTER TABLE users ADD CONSTRAINT users_google_id_unique UNIQUE (google_id);
  END IF;
END $$;

-- ملاحظة: القيد الفريد في PostgreSQL ينشئ فهرساً ضمنياً، وقيم NULL لا تتعارض معه —
-- لذلك كل المستخدمين الحاليين يبقون صالحين دون أي تعديل.
