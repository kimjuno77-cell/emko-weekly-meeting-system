-- 026_ensure_insert_policies_for_all_tables.sql
-- 설명: created_by 삭제 과정(CASCADE)에서 함께 삭제된 기존 INSERT 정책들을 복구하고, 모든 승인된 사용자가 데이터 생성을 할 수 있도록 명확히 재정의합니다.

-- 1. tasks (업무)
DROP POLICY IF EXISTS "승인된 사용자는 업무를 생성할 수 있습니다" ON tasks;
CREATE POLICY "승인된 사용자는 업무를 생성할 수 있습니다" ON tasks FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true)
);

-- 2. pending_items (중점 관리 항목)
DROP POLICY IF EXISTS "승인된 사용자는 Pending 항목을 생성할 수 있습니다" ON pending_items;
CREATE POLICY "승인된 사용자는 Pending 항목을 생성할 수 있습니다" ON pending_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true)
);

-- 3. weekly_updates (주간 업데이트)
DROP POLICY IF EXISTS "승인된 사용자는 주간 업데이트를 생성할 수 있습니다" ON weekly_updates;
CREATE POLICY "승인된 사용자는 주간 업데이트를 생성할 수 있습니다" ON weekly_updates FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true)
);

-- 4. projects (프로젝트)
DROP POLICY IF EXISTS "승인된 사용자는 프로젝트를 생성할 수 있습니다" ON projects;
CREATE POLICY "승인된 사용자는 프로젝트를 생성할 수 있습니다" ON projects FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true)
);

-- 5. project_phases (프로젝트 단계)
DROP POLICY IF EXISTS "승인된 사용자는 프로젝트 단계를 생성할 수 있습니다" ON project_phases;
CREATE POLICY "승인된 사용자는 프로젝트 단계를 생성할 수 있습니다" ON project_phases FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true)
);

-- 6. project_mobilizations (투입 계획)
DROP POLICY IF EXISTS "승인된 사용자는 투입 계획을 생성할 수 있습니다" ON project_mobilizations;
CREATE POLICY "승인된 사용자는 투입 계획을 생성할 수 있습니다" ON project_mobilizations FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true)
);
