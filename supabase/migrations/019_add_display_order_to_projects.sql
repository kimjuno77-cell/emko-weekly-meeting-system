-- 019_add_display_order_to_projects.sql
-- 설명: projects 테이블에 display_order 컬럼 추가

ALTER TABLE projects ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
