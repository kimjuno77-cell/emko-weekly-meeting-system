// 설명: Supabase 클라이언트 초기화 및 설정

import { createClient } from '@supabase/supabase-js';

// 설명: 환경 변수에서 Supabase URL과 익명 키를 가져옵니다
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 설명: 환경 변수 확인
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase 환경 변수가 설정되지 않았습니다. .env 파일을 확인해주세요.'
  );
}

// 설명: Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 설명: 인증 토큰을 로컬 스토리지에 저장
    storage: window.localStorage,
    // 설명: 자동 토큰 갱신 활성화
    autoRefreshToken: true,
    // 설명: 세션 지속성 설정
    persistSession: true,
    // 설명: 이메일 확인 여부
    detectSessionInUrl: true,
  },
});

// 설명: 현재 로그인한 사용자 정보 가져오기
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('사용자 정보를 가져오는데 실패했습니다:', error);
    return null;
  }
  
  return user;
};

// 설명: 현재 사용자의 프로필 정보 가져오기
export const getCurrentUserProfile = async () => {
  const user = await getCurrentUser();
  
  if (!user) {
    return null;
  }
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*, team:teams(*)')
    .eq('id', user.id)
    .single();
  
  if (error) {
    console.error('사용자 프로필을 가져오는데 실패했습니다:', error);
    return null;
  }
  
  return data;
};

// 설명: 로그아웃 함수
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('로그아웃 실패:', error);
    throw error;
  }
};
