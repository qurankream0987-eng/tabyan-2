-- منع تكرار محاولات اختبار الشريعة تحت التزامن (سباق الضغط المزدوج):
-- رقم المحاولة فريد لكل (طالب، مستوى)، فيفشل الإدراج المكرر بـ 23505
-- ويحوّله submitExam إلى خطأ CONFLICT واضح بدل إنشاء نتائج مكررة.
CREATE UNIQUE INDEX IF NOT EXISTS uq_sharia_exam_attempt
  ON sharia_exam_attempts (student_id, level_id, attempt_number);
