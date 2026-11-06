-- Allow teachers to add students to their assigned classes until 1 January 2027.
DROP POLICY IF EXISTS students_write_dean_or_it ON public.school_students;
DROP POLICY IF EXISTS students_insert_authorized ON public.school_students;

CREATE POLICY students_insert_authorized ON public.school_students
FOR INSERT TO authenticated
WITH CHECK (
  public.current_school_role() IN ('dean_of_studies', 'it')
  OR (
    public.current_school_role() = 'teacher'
    AND CURRENT_DATE < DATE '2027-01-01'
    AND EXISTS (
      SELECT 1
      FROM public.teacher_class_assignments assignment
      WHERE assignment.teacher_user_id = (SELECT auth.uid())
        AND assignment.class_name = school_students.class_name
    )
  )
);

CREATE POLICY students_modify_dean_or_it ON public.school_students
FOR UPDATE TO authenticated
USING (public.current_school_role() IN ('dean_of_studies', 'it'))
WITH CHECK (public.current_school_role() IN ('dean_of_studies', 'it'));

CREATE POLICY students_delete_dean_or_it ON public.school_students
FOR DELETE TO authenticated
USING (public.current_school_role() IN ('dean_of_studies', 'it'));
