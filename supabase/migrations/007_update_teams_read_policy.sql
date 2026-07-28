-- 007_update_teams_read_policy.sql
-- 설명: 비로그인(익명) 사용자도 회원가입 시 팀을 선택할 수 있도록 teams 테이블의 SELECT 정책을 변경합니다.

DROP POLICY IF EXISTS "모든 사용자는 팀 정보를 조회할 수 있습니다" ON teams;

CREATE POLICY "모든 사용자는 팀 정보를 조회할 수 있습니다"
  ON teams
  FOR SELECT
  USING (true);
