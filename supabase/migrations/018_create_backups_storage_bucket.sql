-- 018_create_backups_storage_bucket.sql
-- 설명: 관리자가 시스템 전체 데이터를 백업하고 저장할 수 있도록 'backups' 스토리지 버킷을 생성합니다.

-- 1. backups 버킷 생성
INSERT INTO storage.buckets (id, name, public)
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- 2. 관리자(또는 인증된 사용자)만 접근 가능한 RLS 정책 설정
-- (개발 편의를 위해 일단 authenticated 사용자 전체에게 권한을 부여하며, 필요 시 admin 전용으로 제한할 수 있습니다)
CREATE POLICY "인증된 사용자는 백업 버킷에 접근할 수 있습니다"
ON storage.objects FOR SELECT TO authenticated
USING ( bucket_id = 'backups' );

CREATE POLICY "인증된 사용자는 백업 버킷에 업로드할 수 있습니다"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK ( bucket_id = 'backups' );

CREATE POLICY "인증된 사용자는 백업 버킷의 파일을 수정/덮어쓸 수 있습니다"
ON storage.objects FOR UPDATE TO authenticated
USING ( bucket_id = 'backups' );

CREATE POLICY "인증된 사용자는 백업 버킷의 파일을 삭제할 수 있습니다"
ON storage.objects FOR DELETE TO authenticated
USING ( bucket_id = 'backups' );
