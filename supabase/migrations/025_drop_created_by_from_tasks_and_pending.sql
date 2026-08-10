-- 025_drop_created_by_from_tasks_and_pending.sql
-- 설명: tasks 및 pending_items에서 created_by 컬럼을 삭제하여 Supabase의 관계 모호성 에러(Could not embed...)를 원천 차단합니다.

-- 1. 관련된 오래된 권한 정책(Policy)들을 한 번에 안전하게 제거하기 위해 CASCADE 사용
ALTER TABLE tasks DROP COLUMN IF EXISTS created_by CASCADE;
ALTER TABLE pending_items DROP COLUMN IF EXISTS created_by CASCADE;

-- 2. 컬럼이 삭제되었으므로 더 이상 필요 없는 트리거 함수도 깔끔하게 제거
DROP FUNCTION IF EXISTS set_tasks_created_by() CASCADE;
