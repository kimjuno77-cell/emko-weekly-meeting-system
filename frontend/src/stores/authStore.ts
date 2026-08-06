// 설명: 사용자 인증 상태 관리 스토어 (Zustand 사용)

import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase, getCurrentUserProfile } from '@/lib/supabase';
import { UserProfile } from '@/types';

interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  
  // 액션
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, teamId: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  resetPasswordForEmail: (email: string, redirectTo?: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

// 설명: 인증 상태 관리 스토어 생성
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userProfile: null,
  loading: true,
  
  // 설명: 앱 초기화 시 인증 상태 확인
  initialize: async () => {
    try {
      // 설명: 현재 세션 확인
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // 설명: 사용자 프로필 정보 가져오기
        const profile = await getCurrentUserProfile();
        
        set({
          user: session.user,
          userProfile: profile,
          loading: false,
        });
      } else {
        set({ user: null, userProfile: null, loading: false });
      }
      
      // 설명: 인증 상태 변경 리스너 등록
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const profile = await getCurrentUserProfile();
          set({
            user: session.user,
            userProfile: profile,
            loading: false,
          });
        } else {
          set({ user: null, userProfile: null, loading: false });
        }
      });
    } catch (error) {
      console.error('인증 초기화 실패:', error);
      set({ user: null, userProfile: null, loading: false });
    }
  },
  
  // 설명: 이메일/비밀번호로 로그인
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('로그인 실패:', error);
      throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
    
    if (data.user) {
      const profile = await getCurrentUserProfile();
      set({
        user: data.user,
        userProfile: profile,
        loading: false,
      });
    }
  },

  // 설명: 이메일/비밀번호로 회원가입
  signUp: async (email: string, password: string, fullName: string, teamId: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          team_id: teamId,
          is_active: false, // 기본적으로 승인 대기 상태
        },
      },
    });

    if (error) {
      console.error('회원가입 실패:', error);
      throw new Error(error.message || '회원가입에 실패했습니다.');
    }

    if (data.user) {
      const profile = await getCurrentUserProfile();
      set({
        user: data.user,
        userProfile: profile,
        loading: false,
      });
    }
  },
  
  // 설명: 로그아웃
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('로그아웃 실패:', error);
      throw new Error('로그아웃에 실패했습니다.');
    }
    
    set({ user: null, userProfile: null });
  },
  
  // 설명: 비밀번호 재설정 이메일 발송
  resetPasswordForEmail: async (email: string, redirectTo?: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || `${window.location.origin}/`,
    });
    
    if (error) {
      console.error('비밀번호 재설정 요청 실패:', error);
      throw new Error(error.message || '비밀번호 재설정 이메일 발송에 실패했습니다.');
    }
  },

  // 설명: 새 비밀번호로 업데이트
  updatePassword: async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      console.error('비밀번호 업데이트 실패:', error);
      throw new Error(error.message || '비밀번호 변경에 실패했습니다.');
    }
  },
  
  // 설명: 사용자 프로필 업데이트
  updateProfile: async (updates: Partial<UserProfile>) => {
    const currentProfile = useAuthStore.getState().userProfile;
    
    if (!currentProfile) {
      throw new Error('로그인이 필요합니다.');
    }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', currentProfile.id)
      .select()
      .single();
    
    if (error) {
      console.error('프로필 업데이트 실패:', error);
      throw new Error('프로필 업데이트에 실패했습니다.');
    }
    
    set({ userProfile: data });
  },
}));
