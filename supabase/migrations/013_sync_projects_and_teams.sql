-- 013_sync_projects_and_teams.sql
-- 설명: 프로젝트(projects) 테이블과 조직(teams) 테이블 간의 자동 동기화 기능 추가

-- 1. 기존 데이터 마이그레이션
-- 1-1. teams 테이블에서 이름이 '팀'으로 끝나지 않는 항목들을 projects에 추가
INSERT INTO projects (name, description, status, created_at, updated_at)
SELECT name, description, 'active', created_at, updated_at
FROM teams
WHERE name NOT LIKE '%팀'
AND NOT EXISTS (SELECT 1 FROM projects WHERE projects.name = teams.name);

-- 1-2. 반대로 projects에만 있고 teams에 없는 항목들을 teams에 추가 (가입용 조직 목록 동기화)
INSERT INTO teams (name, description, display_order, created_at, updated_at)
SELECT name, description, 999, created_at, updated_at
FROM projects
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE teams.name = projects.name)
ON CONFLICT (name) DO NOTHING;

-- 2. projects 테이블 변경(추가/수정/삭제) 시 teams 테이블에 자동 반영되는 트리거 함수
CREATE OR REPLACE FUNCTION sync_project_to_team()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO teams (name, description, display_order)
    VALUES (NEW.name, NEW.description, 999)
    ON CONFLICT (name) DO NOTHING;
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- 프로젝트 이름이나 설명이 변경되면 팀 테이블도 업데이트
    UPDATE teams 
    SET name = NEW.name, description = NEW.description
    WHERE name = OLD.name;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- 프로젝트가 삭제되면 연결된 팀도 삭제 (실제 '팀' 부서가 아니라는 가정하에)
    DELETE FROM teams WHERE name = OLD.name;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. 트리거 생성
DROP TRIGGER IF EXISTS trg_sync_project_to_team ON projects;
CREATE TRIGGER trg_sync_project_to_team
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW
EXECUTE FUNCTION sync_project_to_team();
