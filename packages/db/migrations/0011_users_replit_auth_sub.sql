-- ترحيل إضافي آمن وإديمبوتنت: ربط هوية Replit Auth (OIDC sub) بحساب الطالب الداخلي.
-- لا يحذف ولا يعدّل أي بيانات: العمود nullable بلا قيمة افتراضية، وقيم NULL لا تتعارض مع القيد الفريد.
-- عمود مستقل عن google_id لأن sub في Replit Auth معرف مستخدم Replit وليس معرف Google.

ALTER TABLE users ADD COLUMN IF NOT EXISTS replit_auth_sub varchar(255);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_replit_auth_sub_unique') THEN
    ALTER TABLE users ADD CONSTRAINT users_replit_auth_sub_unique UNIQUE (replit_auth_sub);
  END IF;
END $$;
