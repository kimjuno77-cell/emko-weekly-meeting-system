// 설명: 팀 관련 CRUD API 서비스

import { supabase } from '@/lib/supabase';
import { Team } from '@/types';

// 설명: 모든 팀 목록 가져오기 (순서 정렬)
export const getAllTeams = async (): Promise<Team[]> => {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('display_order', { ascending: true });
  
  if (error) {
    console.error('팀 목록 조회 실패:', error);
    throw new Error('팀 목록을 불러오는데 실패했습니다.');
  }
  
  return data || [];
};

// 설명: 특정 팀 정보 가져오기
export const getTeamById = async (teamId: string): Promise<Team | null> => {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();
  
  if (error) {
    console.error('팀 정보 조회 실패:', error);
    return null;
  }
  
  return data;
};

// 설명: 새 팀 생성 (관리자 전용)
export const createTeam = async (team: Partial<Team>): Promise<Team> => {
  const { data, error } = await supabase
    .from('teams')
    .insert([team])
    .select()
    .single();
  
  if (error) {
    console.error('팀 생성 실패:', error);
    throw new Error('팀을 생성하는데 실패했습니다.');
  }
  
  return data;
};

// 설명: 팀 정보 수정 (관리자 전용)
export const updateTeam = async (
  teamId: string,
  updates: Partial<Team>
): Promise<Team> => {
  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', teamId)
    .select()
    .single();
  
  if (error) {
    console.error('팀 정보 수정 실패:', error);
    throw new Error('팀 정보를 수정하는데 실패했습니다.');
  }
  
  return data;
};

// 설명: 팀 삭제 (관리자 전용)
export const deleteTeam = async (teamId: string): Promise<void> => {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId);
  
  if (error) {
    console.error('팀 삭제 실패:', error);
    throw new Error('팀을 삭제하는데 실패했습니다.');
  }
};
