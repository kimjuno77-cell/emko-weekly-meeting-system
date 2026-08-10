-- 024_simplify_rls_for_all_active_users.sql
-- 설명: 잦은 권한 에러 해결을 위해 관리자 외에도 모든 승인된 사용자가 업무/프로젝트/주간업무 등을 자유롭게 등록/수정/삭제 가능하도록 RLS 정책 전면 개방
-- 단, user_profiles (회원 승인 관리)는 기존대로 관리자만 수정 가능

-- 1. tasks (업무)
DROP POLICY IF EXISTS "작성자 및 관리자는 업무(Task)를 수정할 수 있습니다" ON tasks;
DROP POLICY IF EXISTS "작성자 및 관리자는 업무(Task)를 삭제할 수 있습니다" ON tasks;
DROP POLICY IF EXISTS "담당자는 배정된 업무(Task)를 수정할 수 있습니다" ON tasks;
DROP POLICY IF EXISTS "승인된 사용자는 업무를 수정할 수 있습니다" ON tasks;
DROP POLICY IF EXISTS "승인된 사용자는 업무를 삭제할 수 있습니다" ON tasks;

CREATE POLICY "승인된 사용자는 업무를 수정할 수 있습니다" ON tasks FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true)
);
CREATE POLICY "승인된 사용자는 업무를 삭제할 수 있습니다" ON tasks FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true)
);

-- 2. pending_items (중점 관리 항목)
DROP POLICY IF EXISTS "작성자 및 관리자는 Pending 항목을 수정할 수 있습니다" ON pending_items;
DROP POLICY IF EXISTS "작성자 및 관리자는 Pending 항목을 삭제할 수 있습니다" ON pending_items;
DROP POLICY IF EXISTS "승인된 사용자는 Pending 항목을 수정할 수 있습니다" ON pending_items;
DROP POLICY IF EXISTS "승인된 사용자는 Pending 항목을 삭제할 수 있습니다" ON pending_items;

CREATE POLICY "승인된 사용자는 Pending 항목을 수정할 수 있습니다" ON pending_items FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true)
);
CREATE POLICY "승인된 사용자는 Pending 항목을 삭제할 수 있습니다" ON pending_items FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true)
);

-- 3. weekly_updates (주간 업데이트)
DROP POLICY IF EXISTS "작성자 및 관리자는 주간 업데이트를 수정할 수 있습니다" ON weekly_updates;
DROP POLICY IF EXISTS "작성자 및 관리자는 주간 업데이트를 삭제할 수 있습니다" ON weekly_updates;
DROP POLICY IF EXISTS "승인된 사용자는 주간 업데이트를 수정할 수 있습니다" ON weekly_updates;
DROP POLICY IF EXISTS "승인된 사용자는 주간 업데이트를 삭제할 수 있습니다" ON weekly_updates;

CREATE POLICY "승인된 사용자는 주간 업데이트를 수정할 수 있습니다" ON weekly_updates FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true)
);
CREATE POLICY "승인된 사용자는 주간 업데이트를 삭제할 수 있습니다" ON weekly_updates FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true)
);

-- 4. projects (프로젝트)
DROP POLICY IF EXISTS "모든 승인된 사용자는 프로젝트를 수정할 수 있습니다" ON projects;
DROP POLICY IF EXISTS "모든 승인된 사용자는 프로젝트를 삭제할 수 있습니다" ON projects;
DROP POLICY IF EXISTS "작성자 및 관리자는 프로젝트를 수정할 수 있습니다" ON projects;
DROP POLICY IF EXISTS "작성자 및 관리자는 프로젝트를 삭제할 수 있습니다" ON projects;
DROP POLICY IF EXISTS "승인된 사용자는 프로젝트를 수정할 수 있습니다" ON projects;
DROP POLICY IF EXISTS "승인된 사용자는 프로젝트를 삭제할 수 있습니다" ON projects;

CREATE POLICY "승인된 사용자는 프로젝트를 수정할 수 있습니다" ON projects FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true)
);
CREATE POLICY "승인된 사용자는 프로젝트를 삭제할 수 있습니다" ON projects FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true)
);

-- 5. project_phases (프로젝트 단계)
DROP POLICY IF EXISTS "모든 승인된 사용자는 프로젝트 단계를 수정할 수 있습니다" ON project_phases;
DROP POLICY IF EXISTS "모든 승인된 사용자는 프로젝트 단계를 삭제할 수 있습니다" ON project_phases;
DROP POLICY IF EXISTS "작성자 및 관리자는 프로젝트 단계를 수정할 수 있습니다" ON project_phases;
DROP POLICY IF EXISTS "작성자 및 관리자는 프로젝트 단계를 삭제할 수 있습니다" ON project_phases;
DROP POLICY IF EXISTS "승인된 사용자는 프로젝트 단계를 수정할 수 있습니다" ON project_phases;
DROP POLICY IF EXISTS "승인된 사용자는 프로젝트 단계를 삭제할 수 있습니다" ON project_phases;

CREATE POLICY "승인된 사용자는 프로젝트 단계를 수정할 수 있습니다" ON project_phases FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true)
);
CREATE POLICY "승인된 사용자는 프로젝트 단계를 삭제할 수 있습니다" ON project_phases FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true)
);

-- 6. project_mobilizations (투입 계획)
DROP POLICY IF EXISTS "모든 승인된 사용자는 투입 계획을 수정할 수 있습니다" ON project_mobilizations;
DROP POLICY IF EXISTS "모든 승인된 사용자는 투입 계획을 삭제할 수 있습니다" ON project_mobilizations;
DROP POLICY IF EXISTS "작성자 및 관리자는 투입 계획을 수정할 수 있습니다" ON project_mobilizations;
DROP POLICY IF EXISTS "작성자 및 관리자는 투입 계획을 삭제할 수 있습니다" ON project_mobilizations;
DROP POLICY IF EXISTS "승인된 사용자는 투입 계획을 수정할 수 있습니다" ON project_mobilizations;
DROP POLICY IF EXISTS "승인된 사용자는 투입 계획을 삭제할 수 있습니다" ON project_mobilizations;

CREATE POLICY "승인된 사용자는 투입 계획을 수정할 수 있습니다" ON project_mobilizations FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true)
);
CREATE POLICY "승인된 사용자는 투입 계획을 삭제할 수 있습니다" ON project_mobilizations FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true)
);

-- 7. teams (팀)
DROP POLICY IF EXISTS "관리자는 팀을 생성할 수 있습니다" ON teams;
DROP POLICY IF EXISTS "관리자는 팀을 수정할 수 있습니다" ON teams;
DROP POLICY IF EXISTS "관리자는 팀을 삭제할 수 있습니다" ON teams;
DROP POLICY IF EXISTS "승인된 사용자는 팀을 생성할 수 있습니다" ON teams;
DROP POLICY IF EXISTS "승인된 사용자는 팀을 수정할 수 있습니다" ON teams;
DROP POLICY IF EXISTS "승인된 사용자는 팀을 삭제할 수 있습니다" ON teams;

CREATE POLICY "승인된 사용자는 팀을 생성할 수 있습니다" ON teams FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true)
);
CREATE POLICY "승인된 사용자는 팀을 수정할 수 있습니다" ON teams FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true)
);
CREATE POLICY "승인된 사용자는 팀을 삭제할 수 있습니다" ON teams FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true)
);

-- 8. offline_personnel (외부 인력)
DROP POLICY IF EXISTS "관리자는 외부 인력을 관리할 수 있습니다" ON offline_personnel;
DROP POLICY IF EXISTS "승인된 사용자는 외부 인력을 생성할 수 있습니다" ON offline_personnel;
DROP POLICY IF EXISTS "승인된 사용자는 외부 인력을 수정할 수 있습니다" ON offline_personnel;
DROP POLICY IF EXISTS "승인된 사용자는 외부 인력을 삭제할 수 있습니다" ON offline_personnel;

CREATE POLICY "승인된 사용자는 외부 인력을 생성할 수 있습니다" ON offline_personnel FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true)
);
CREATE POLICY "승인된 사용자는 외부 인력을 수정할 수 있습니다" ON offline_personnel FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true)
);
CREATE POLICY "승인된 사용자는 외부 인력을 삭제할 수 있습니다" ON offline_personnel FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true)
);
