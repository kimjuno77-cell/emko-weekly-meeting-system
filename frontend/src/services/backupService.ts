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
    offline_personnel: any[];
    projects: any[];
    project_phases: any[];
    team_members: any[];
    project_members: any[];
    project_mobilizations: any[];
    weekly_updates: any[];
    tasks: any[];
    pending_items: any[];
    attachments: any[];
    comments: any[];
  };
}

// 설명: 시스템 전체 데이터 백업 (JSON 파일 다운로드)
export const exportSystemBackup = async (): Promise<void> => {
  const user = await supabase.auth.getUser();

  // 모든 테이블 데이터 조회
  const { data: teams } = await supabase.from('teams').select('*');
  const { data: user_profiles } = await supabase.from('user_profiles').select('*');
  const { data: offline_personnel } = await supabase.from('offline_personnel').select('*');
  const { data: projects } = await supabase.from('projects').select('*');
  const { data: project_phases } = await supabase.from('project_phases').select('*');
  const { data: team_members } = await supabase.from('team_members').select('*');
  const { data: project_members } = await supabase.from('project_members').select('*');
  const { data: project_mobilizations } = await supabase.from('project_mobilizations').select('*');
  const { data: weekly_updates } = await supabase.from('weekly_updates').select('*');
  const { data: tasks } = await supabase.from('tasks').select('*');
  const { data: pending_items } = await supabase.from('pending_items').select('*');
  const { data: attachments } = await supabase.from('attachments').select('*');
  const { data: comments } = await supabase.from('comments').select('*');

  const backupObject: BackupData = {
    version: '1.1',
    exported_at: new Date().toISOString(),
    exported_by: user.data.user?.email || 'admin',
    data: {
      teams: teams || [],
      user_profiles: user_profiles || [],
      offline_personnel: offline_personnel || [],
      projects: projects || [],
      project_phases: project_phases || [],
      team_members: team_members || [],
      project_members: project_members || [],
      project_mobilizations: project_mobilizations || [],
      weekly_updates: weekly_updates || [],
      tasks: tasks || [],
      pending_items: pending_items || [],
      attachments: attachments || [],
      comments: comments || []
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

  const { 
    teams, user_profiles, offline_personnel, projects, project_phases, 
    team_members, project_members, project_mobilizations, 
    weekly_updates, tasks, pending_items, attachments, comments 
  } = backupJson.data;

  try {
    // 외래 키 무결성을 유지하기 위한 순차적 복원 (upsert)
    
    // 1. Teams
    if (teams && teams.length > 0) {
      const { error } = await supabase.from('teams').upsert(teams);
      if (error) console.error('teams 복원 에러:', error);
    }

    // 2. User Profiles
    if (user_profiles && user_profiles.length > 0) {
      const { error } = await supabase.from('user_profiles').upsert(user_profiles);
      if (error) console.error('user_profiles 복원 에러:', error);
    }

    // 3. Offline Personnel
    if (offline_personnel && offline_personnel.length > 0) {
      const { error } = await supabase.from('offline_personnel').upsert(offline_personnel);
      if (error) console.error('offline_personnel 복원 에러:', error);
    }

    // 4. Projects
    if (projects && projects.length > 0) {
      const { error } = await supabase.from('projects').upsert(projects);
      if (error) console.error('projects 복원 에러:', error);
    }

    // 5. Project Phases
    if (project_phases && project_phases.length > 0) {
      const { error } = await supabase.from('project_phases').upsert(project_phases);
      if (error) console.error('project_phases 복원 에러:', error);
    }

    // 6. Team Members
    if (team_members && team_members.length > 0) {
      const { error } = await supabase.from('team_members').upsert(team_members);
      if (error) console.error('team_members 복원 에러:', error);
    }

    // 7. Project Members
    if (project_members && project_members.length > 0) {
      const { error } = await supabase.from('project_members').upsert(project_members);
      if (error) console.error('project_members 복원 에러:', error);
    }

    // 8. Project Mobilizations
    if (project_mobilizations && project_mobilizations.length > 0) {
      const { error } = await supabase.from('project_mobilizations').upsert(project_mobilizations);
      if (error) console.error('project_mobilizations 복원 에러:', error);
    }

    // 9. Weekly Updates
    if (weekly_updates && weekly_updates.length > 0) {
      const { error } = await supabase.from('weekly_updates').upsert(weekly_updates);
      if (error) console.error('weekly_updates 복원 에러:', error);
    }

    // 10. Tasks
    if (tasks && tasks.length > 0) {
      const { error } = await supabase.from('tasks').upsert(tasks);
      if (error) console.error('tasks 복원 에러:', error);
    }

    // 11. Pending Items
    if (pending_items && pending_items.length > 0) {
      const { error } = await supabase.from('pending_items').upsert(pending_items);
      if (error) console.error('pending_items 복원 에러:', error);
    }

    // 12. Attachments
    if (attachments && attachments.length > 0) {
      const { error } = await supabase.from('attachments').upsert(attachments);
      if (error) console.error('attachments 복원 에러:', error);
    }

    // 13. Comments
    if (comments && comments.length > 0) {
      const { error } = await supabase.from('comments').upsert(comments);
      if (error) console.error('comments 복원 에러:', error);
    }

    return {
      success: true,
      message: `성공적으로 복원되었습니다! (팀: ${teams?.length || 0}개, 사용자: ${user_profiles?.length || 0}명, 오프라인 인력: ${offline_personnel?.length || 0}명, 프로젝트: ${projects?.length || 0}개 등 전체 복원 완료)`
    };
  } catch (error: any) {
    console.error('복원 실패:', error);
    throw new Error(error.message || '복원 작업 중 오류가 발생했습니다.');
  }
};
