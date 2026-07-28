-- 006_update_handle_new_user_trigger.sql
-- 설명: 회원가입 시 팀 아이디(team_id)와 승인 상태(is_active)를 반영하도록 트리거 함수를 업데이트합니다.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, team_id, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    (NEW.raw_user_meta_data->>'team_id')::UUID,
    COALESCE((NEW.raw_user_meta_data->>'is_active')::BOOLEAN, false) -- 기본값을 false(승인 대기)로 설정
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
