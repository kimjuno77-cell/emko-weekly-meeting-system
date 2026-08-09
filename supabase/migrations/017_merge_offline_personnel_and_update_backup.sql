-- 017_merge_offline_personnel_and_update_backup.sql
-- 설명: 미가입 인력에 이메일 필드를 추가하고, 실제 회원으로 승인 시 데이터를 자동으로 통합하는 함수를 생성합니다.

-- 1. offline_personnel 테이블에 이메일 컬럼 추가
ALTER TABLE offline_personnel ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;

-- 2. 회원 승인 및 오프라인 인력 통합 처리 RPC
CREATE OR REPLACE FUNCTION approve_user_and_merge_offline(p_user_id UUID, p_team_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email VARCHAR;
  v_offline_id UUID;
BEGIN
  -- 1) 사용자 승인 처리 및 이메일 조회
  UPDATE user_profiles
  SET is_active = true,
      team_id = COALESCE(p_team_id, team_id)
  WHERE id = p_user_id
  RETURNING email INTO v_email;

  -- 2) 동일한 이메일을 가진 미가입 인력 확인
  IF v_email IS NOT NULL THEN
    SELECT id INTO v_offline_id
    FROM offline_personnel
    WHERE email = v_email
    LIMIT 1;
    
    IF v_offline_id IS NOT NULL THEN
      -- 3-1) team_members 이관 (중복 방지: 이미 해당 user_id로 소속된 팀의 오프라인 기록은 제거)
      DELETE FROM team_members 
      WHERE offline_personnel_id = v_offline_id 
        AND team_id IN (SELECT team_id FROM team_members WHERE user_id = p_user_id);
        
      UPDATE team_members
      SET user_id = p_user_id,
          offline_personnel_id = NULL
      WHERE offline_personnel_id = v_offline_id;

      -- 3-2) project_members 이관 (중복 방지)
      DELETE FROM project_members 
      WHERE offline_personnel_id = v_offline_id 
        AND project_id IN (SELECT project_id FROM project_members WHERE user_id = p_user_id);

      UPDATE project_members
      SET user_id = p_user_id,
          offline_personnel_id = NULL
      WHERE offline_personnel_id = v_offline_id;

      -- 3-3) project_mobilizations 이관
      UPDATE project_mobilizations
      SET user_id = p_user_id,
          offline_personnel_id = NULL
      WHERE offline_personnel_id = v_offline_id;
      
      -- 4) 통합이 완료된 기존 미가입 인력 레코드 삭제
      DELETE FROM offline_personnel WHERE id = v_offline_id;
    END IF;
  END IF;
END;
$$;
