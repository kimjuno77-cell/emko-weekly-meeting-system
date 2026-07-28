// 설명: 전체 데이터 백업(JSON 내보내기) 및 복원(JSON 가져오기) 서비스

import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

export interface BackupData {
  version: string;
  exported_at: string;
  exported_by?: string;
  data: {
    teams: any[];
    user_profiles: any[];
    weekly_updates: any[];
    tasks: any[];
    pending_items: any[];
  };
}

// 설명: 시스템 전체 데이터 백업 (JSON 파일 다운로드)
export const exportSystemBackup = async (): Promise<void> => {
  const user = await supabase.auth.getUser();

  // 1. 주요 5개 테이블 데이터 조회
  const { data: teams } = await supabase.from('teams').select('*');
  const { data: user_profiles } = await supabase.from('user_profiles').select('*');
  const { data: weekly_updates } = await supabase.from('weekly_updates').select('*');
  const { data: tasks } = await supabase.from('tasks').select('*');
  const { data: pending_items } = await supabase.from('pending_items').select('*');

  const backupObject: BackupData = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    exported_by: user.data.user?.email || 'admin',
    data: {
      teams: teams || [],
      user_profiles: user_profiles || [],
      weekly_updates: weekly_updates || [],
      tasks: tasks || [],
      pending_items: pending_items || []
    }
  };

  // 2. JSON 파일 다운로드 트리거
  const jsonStr = JSON.stringify(backupObject, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const timestamp = format(new Date(), 'yyyyMMdd_HHmm');
  const fileName = `weekly_meeting_backup_${timestamp}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 설명: 백업 파일(JSON)로 데이터베이스 복원
export const importSystemRestore = async (backupJson: BackupData): Promise<{ success: boolean; message: string }> => {
  if (!backupJson || !backupJson.data) {
    throw new Error('올바르지 않은 백업 파일 형식입니다.');
  }

  const { teams, user_profiles, weekly_updates, tasks, pending_items } = backupJson.data;

  try {
    // 1. Teams 복원 (upsert)
    if (teams && teams.length > 0) {
      const { error } = await supabase.from('teams').upsert(teams);
      if (error) console.error('teams 복원 방해:', error);
    }

    // 2. User Profiles 복원
    if (user_profiles && user_profiles.length > 0) {
      const { error } = await supabase.from('user_profiles').upsert(user_profiles);
      if (error) console.error('user_profiles 복원 방해:', error);
    }

    // 3. Weekly Updates 복원
    if (weekly_updates && weekly_updates.length > 0) {
      const { error } = await supabase.from('weekly_updates').upsert(weekly_updates);
      if (error) console.error('weekly_updates 복원 방해:', error);
    }

    // 4. Tasks 복원
    if (tasks && tasks.length > 0) {
      const { error } = await supabase.from('tasks').upsert(tasks);
      if (error) console.error('tasks 복원 방해:', error);
    }

    // 5. Pending Items 복원
    if (pending_items && pending_items.length > 0) {
      const { error } = await supabase.from('pending_items').upsert(pending_items);
      if (error) console.error('pending_items 복원 방해:', error);
    }

    return {
      success: true,
      message: `성공적으로 복원되었습니다! (팀: ${teams?.length || 0}개, 사용자: ${user_profiles?.length || 0}명, 보고서: ${weekly_updates?.length || 0}건, 작업: ${tasks?.length || 0}개, Pending: ${pending_items?.length || 0}개)`
    };
  } catch (error: any) {
    console.error('복원 실패:', error);
    throw new Error(error.message || '복원 작업 중 오류가 발생했습니다.');
  }
};
