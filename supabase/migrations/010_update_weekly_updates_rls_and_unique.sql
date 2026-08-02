-- 010_update_weekly_updates_rls_and_unique.sql
-- 설명: 다중 팀/프로젝트 주간 보고서 작성을 위해 제약조건 완화 및 RLS 변경

-- 1. 기존 유니크 제약조건 제거
ALTER TABLE weekly_updates DROP CONSTRAINT IF EXISTS unique_team_week;
DROP INDEX IF EXISTS unique_team_week_idx;
DROP INDEX IF EXISTS unique_project_week_idx;

-- 2. 팀+프로젝트+주차 조합의 복합 유니크 제약조건 추가
-- 한 팀이 같은 주차에 여러 프로젝트에 대한 보고서를 각각 생성하거나,
-- 팀 지정 없이 프로젝트에 대해서만 생성하는 것을 허용함
CREATE UNIQUE INDEX IF NOT EXISTS unique_team_project_week_idx 
ON weekly_updates (
  COALESCE(team_id, '00000000-0000-0000-0000-000000000000'), 
  COALESCE(project_id, '00000000-0000-0000-0000-000000000000'), 
  week_start_date
);

-- 3. weekly_updates RLS 정책 변경 (모든 인증된 사용자 작성 허용)
DROP POLICY IF EXISTS "같은 팀 사용자는 주간 업데이트를 생성할 수 있습니다" ON weekly_updates;
CREATE POLICY "모든 사용자는 주간 업데이트를 생성할 수 있습니다"
  ON weekly_updates FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "같은 팀 사용자는 주간 업데이트를 수정할 수 있습니다" ON weekly_updates;
CREATE POLICY "모든 사용자는 주간 업데이트를 수정할 수 있습니다"
  ON weekly_updates FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. tasks RLS 정책 변경 (모든 인증된 사용자 작성/수정/삭제 허용)
DROP POLICY IF EXISTS "같은 팀 사용자는 작업 항목을 생성할 수 있습니다" ON tasks;
CREATE POLICY "모든 사용자는 작업 항목을 생성할 수 있습니다"
  ON tasks FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "같은 팀 사용자는 작업 항목을 수정할 수 있습니다" ON tasks;
CREATE POLICY "모든 사용자는 작업 항목을 수정할 수 있습니다"
  ON tasks FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "같은 팀 사용자는 작업 항목을 삭제할 수 있습니다" ON tasks;
CREATE POLICY "모든 사용자는 작업 항목을 삭제할 수 있습니다"
  ON tasks FOR DELETE TO authenticated
  USING (true);
