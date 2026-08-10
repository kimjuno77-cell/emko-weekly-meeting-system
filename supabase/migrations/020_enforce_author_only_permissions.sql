-- 020_enforce_author_only_permissions.sql
-- 설명: 작성자 본인 및 관리자만 항목을 수정/삭제할 수 있도록 RLS 정책 강화 및 created_by 필드 추가

-- 1. tasks 테이블에 created_by 추가
ALTER TABLE tasks ADD COLUMN created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL;

-- 2. 기존 tasks의 created_by 백필 (weekly_updates의 created_by 값 사용)
UPDATE tasks t
SET created_by = wu.created_by
FROM weekly_updates wu
WHERE t.weekly_update_id = wu.id;

-- 3. tasks 테이블에 INSERT 시 created_by가 없으면 자동으로 auth.uid() 할당하는 트리거
CREATE OR REPLACE FUNCTION set_tasks_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_tasks_created_by ON tasks;
CREATE TRIGGER trg_set_tasks_created_by
  BEFORE INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_tasks_created_by();

-- 4. project_phases 테이블에 created_by 추가 및 백필
ALTER TABLE project_phases ADD COLUMN created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL;

UPDATE project_phases pp
SET created_by = p.created_by
FROM projects p
WHERE pp.project_id = p.id;

CREATE OR REPLACE FUNCTION set_project_phases_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    -- 프로젝트 생성자 조회
    NEW.created_by := (SELECT created_by FROM projects WHERE id = NEW.project_id);
    IF NEW.created_by IS NULL THEN
      NEW.created_by := auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_project_phases_created_by ON project_phases;
CREATE TRIGGER trg_set_project_phases_created_by
  BEFORE INSERT ON project_phases
  FOR EACH ROW
  EXECUTE FUNCTION set_project_phases_created_by();


-- 5. RLS 정책 전면 수정 (작성자 OR 관리자만 수정/삭제)

-- (A) tasks
DROP POLICY IF EXISTS "같은 팀 사용자는 작업(Task)을 수정할 수 있습니다" ON tasks;
DROP POLICY IF EXISTS "같은 팀 사용자는 작업(Task)을 삭제할 수 있습니다" ON tasks;

CREATE POLICY "작성자 및 관리자는 작업(Task)을 수정할 수 있습니다"
  ON tasks FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "작성자 및 관리자는 작업(Task)을 삭제할 수 있습니다"
  ON tasks FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());


-- (B) pending_items
DROP POLICY IF EXISTS "같은 팀 또는 담당자는 Pending 항목을 수정할 수 있습니다" ON pending_items;
DROP POLICY IF EXISTS "작성자는 Pending 항목을 삭제할 수 있습니다" ON pending_items;

CREATE POLICY "작성자 및 관리자는 Pending 항목을 수정할 수 있습니다"
  ON pending_items FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "작성자 및 관리자는 Pending 항목을 삭제할 수 있습니다"
  ON pending_items FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());


-- (C) weekly_updates
DROP POLICY IF EXISTS "같은 팀 사용자는 주간 업데이트를 수정할 수 있습니다" ON weekly_updates;
DROP POLICY IF EXISTS "같은 팀 사용자는 주간 업데이트를 삭제할 수 있습니다" ON weekly_updates;

CREATE POLICY "작성자 및 관리자는 주간 업데이트를 수정할 수 있습니다"
  ON weekly_updates FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "작성자 및 관리자는 주간 업데이트를 삭제할 수 있습니다"
  ON weekly_updates FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());


-- (D) projects (기존: FOR ALL TO authenticated USING (public.is_admin()))
DROP POLICY IF EXISTS "관리자는 프로젝트를 관리할 수 있습니다" ON projects;

CREATE POLICY "인증된 사용자는 프로젝트를 생성할 수 있습니다"
  ON projects FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "작성자 및 관리자는 프로젝트를 수정할 수 있습니다"
  ON projects FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "작성자 및 관리자는 프로젝트를 삭제할 수 있습니다"
  ON projects FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());


-- (E) project_phases
DROP POLICY IF EXISTS "관리자는 프로젝트 일정을 관리할 수 있습니다" ON project_phases;

CREATE POLICY "인증된 사용자는 프로젝트 일정을 생성할 수 있습니다"
  ON project_phases FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "작성자 및 관리자는 프로젝트 일정을 수정할 수 있습니다"
  ON project_phases FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "작성자 및 관리자는 프로젝트 일정을 삭제할 수 있습니다"
  ON project_phases FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());


-- (F) project_mobilizations
DROP POLICY IF EXISTS "관리자는 투입 계획을 관리할 수 있습니다" ON project_mobilizations;

CREATE POLICY "인증된 사용자는 투입 계획을 생성할 수 있습니다"
  ON project_mobilizations FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "작성자 및 관리자는 투입 계획을 수정할 수 있습니다"
  ON project_mobilizations FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "작성자 및 관리자는 투입 계획을 삭제할 수 있습니다"
  ON project_mobilizations FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());
