-- مرجعية مستوى المعلم المعيَّن: حذف المستوى يصفّر التعيين بدل ترك مرجع يتيم
ALTER TABLE teachers
  ADD CONSTRAINT teachers_assigned_level_id_fk
  FOREIGN KEY (assigned_level_id) REFERENCES levels(id) ON DELETE SET NULL;
