-- 014_insert_default_phases.sql
-- 설명: 기존 프로젝트 중 세부 스케줄(Phase)이 없는 프로젝트에 기본 스케줄(설계, 구매, 제작, 검사, 설치, 시운전)을 일괄 추가합니다.

INSERT INTO project_phases (project_id, phase_name, display_order, status)
SELECT 
    p.id, 
    v.phase_name, 
    v.display_order, 
    'pending'
FROM projects p
CROSS JOIN (
    VALUES 
        ('설계', 0), 
        ('구매', 1), 
        ('제작', 2), 
        ('검사', 3), 
        ('설치', 4), 
        ('시운전', 5)
) AS v(phase_name, display_order)
WHERE NOT EXISTS (
    SELECT 1 FROM project_phases ph WHERE ph.project_id = p.id
);
