-- الدفعة الثانية: حسابات المشرفين/المعلمين المنشأة من لوحة الإشراف
-- الهاتف يصبح اختيارياً (دخول باسم مستخدم)، وحقول التتبع created_by/account_origin، ومسار/مستوى المعلم المعيَّن
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS username varchar(30);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username);
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by varchar(36);
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_origin varchar(30);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS assigned_path varchar(30);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS assigned_level_id integer;
-- الحسابات الموجودة قبل هذا النظام مصدرها التسجيل الذاتي
UPDATE users SET account_origin = 'self_registered' WHERE role IN ('student', 'teacher') AND account_origin IS NULL;
