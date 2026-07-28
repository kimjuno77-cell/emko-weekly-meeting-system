-- 008_attachments_and_comments.sql
-- 설명: 첨부파일 및 댓글 테이블 생성

-- 1. Attachments 테이블
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  content_type VARCHAR(100),
  entity_type VARCHAR(50) NOT NULL, -- 'task', 'update' 등 파일이 연결된 대상 유형
  entity_id UUID NOT NULL,          -- 연결된 대상의 ID
  uploaded_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Comments 테이블
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- 'task', 'update' 등 댓글이 연결된 대상 유형
  entity_id UUID NOT NULL,
  author_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 빠른 조회를 위한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);

-- 트리거 등록
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 보안 정책 (RLS) 설정
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 첨부파일 (읽기는 모두, 생성은 인증유저, 삭제는 작성자/관리자)
DROP POLICY IF EXISTS "누구나 첨부파일 정보 조회 가능" ON attachments;
CREATE POLICY "누구나 첨부파일 정보 조회 가능" ON attachments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "인증된 사용자는 첨부파일 업로드 가능" ON attachments;
CREATE POLICY "인증된 사용자는 첨부파일 업로드 가능" ON attachments FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "작성자와 관리자만 첨부파일 삭제 가능" ON attachments;
CREATE POLICY "작성자와 관리자만 첨부파일 삭제 가능" ON attachments FOR DELETE TO authenticated USING (auth.uid() = uploaded_by OR public.is_admin());

-- 댓글 (읽기는 모두, 생성은 인증유저, 수정/삭제는 작성자/관리자)
DROP POLICY IF EXISTS "누구나 댓글 조회 가능" ON comments;
CREATE POLICY "누구나 댓글 조회 가능" ON comments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "인증된 사용자는 댓글 작성 가능" ON comments;
CREATE POLICY "인증된 사용자는 댓글 작성 가능" ON comments FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "작성자와 관리자만 댓글 수정 가능" ON comments;
CREATE POLICY "작성자와 관리자만 댓글 수정 가능" ON comments FOR UPDATE TO authenticated USING (auth.uid() = author_id OR public.is_admin());

DROP POLICY IF EXISTS "작성자와 관리자만 댓글 삭제 가능" ON comments;
CREATE POLICY "작성자와 관리자만 댓글 삭제 가능" ON comments FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.is_admin());
