-- 023_allow_assignee_to_edit_tasks.sql
-- 설명: 업무(Task)의 수정/삭제 권한을 작성자뿐만 아니라 담당자(assigned_to)에게도 부여

DROP POLICY IF EXISTS "작성자 및 관리자는 작업(Task)을 수정할 수 있습니다" ON tasks;
DROP POLICY IF EXISTS "작성자 및 관리자는 작업(Task)을 삭제할 수 있습니다" ON tasks;

CREATE POLICY "작성자, 담당자 및 관리자는 작업(Task)을 수정할 수 있습니다"
  ON tasks FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid() OR public.is_admin());

CREATE POLICY "작성자, 담당자 및 관리자는 작업(Task)을 삭제할 수 있습니다"
  ON tasks FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid() OR public.is_admin());

-- pending_items 도 동일하게 적용 (선택적)
DROP POLICY IF EXISTS "작성자 및 관리자는 Pending 항목을 수정할 수 있습니다" ON pending_items;
DROP POLICY IF EXISTS "작성자 및 관리자는 Pending 항목을 삭제할 수 있습니다" ON pending_items;

CREATE POLICY "작성자, 담당자 및 관리자는 Pending 항목을 수정할 수 있습니다"
  ON pending_items FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid() OR public.is_admin());

CREATE POLICY "작성자, 담당자 및 관리자는 Pending 항목을 삭제할 수 있습니다"
  ON pending_items FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid() OR public.is_admin());