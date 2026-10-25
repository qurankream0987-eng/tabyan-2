-- حفظ اختيار الطالب لمنظومة تحفة الأطفال.
-- nullable عمداً: NULL تعني لم يُسأل الطالب أو لم يُكمل الاختبار، وليست "لا أريد".
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS wants_tuhfa boolean;

-- ترحيل الاختيارات الإيجابية القديمة التي كانت تُمثَّل فقط بتعيين الكتاب.
UPDATE students AS s
SET wants_tuhfa = TRUE
FROM book_assignments AS ba
INNER JOIN books AS b ON b.id = ba.book_id
WHERE s.user_id = ba.student_id
  AND b.title = 'تحفة الأطفال'
  AND s.wants_tuhfa IS NULL;