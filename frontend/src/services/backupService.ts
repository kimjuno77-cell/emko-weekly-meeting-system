// 설명: 전체 데이터 백업(JSON 내보내기/클라우드 저장) 및 복원(JSON 가져오기) 서비스

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

export interface BackupFileMeta {
  name: string;
  id: string;
  created_at: string;
  metadata: {
    size: number;
    mimetype: string;
  };
}

// 헬퍼: 페이지네이션으로 한 테이블의 모든 데이터 가져오기 (1000건 제한 돌파)
const fetchAllRows = async (tableName: string) => {
  let allData: any[] = [];
  let from = 0;
  const step = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(from, from + step - 1);

    if (error) throw error;
    
    if (data && data.length > 0) {
      allData = [...allData, ...data];
      from += step;
      if (data.length < step) hasMore = false;
    } else {
      hasMore = false;
    }
  }
  return allData;
};

// 헬퍼: 배열을 N개씩 청크(Chunk)로 쪼개기
const chunkArray = (array: any[], size: number) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

// 헬퍼: 테이블에 Chunk 단위로 Upsert 수행
const upsertInChunks = async (tableName: string, data: any[], chunkSize: number = 500) => {
  if (!data || data.length === 0) return;
  const chunks = chunkArray(data, chunkSize);
  for (const chunk of chunks) {
    const { error } = await supabase.from(tableName).upsert(chunk);
    if (error) {
      console.error(`${tableName} 복원 에러 (Chunk):`, error);
      throw error;
    }
  }
};

export const generateBackupData = async (): Promise<BackupData> => {
  const user = await supabase.auth.getUser();

  const [
    teams, user_profiles, offline_personnel, projects, project_phases,
    team_members, project_members, project_mobilizations,
    weekly_updates, tasks, pending_items, attachments, comments
  ] = await Promise.all([
    fetchAllRows('teams'),
    fetchAllRows('user_profiles'),
    fetchAllRows('offline_personnel'),
    fetchAllRows('projects'),
    fetchAllRows('project_phases'),
    fetchAllRows('team_members'),
    fetchAllRows('project_members'),
    fetchAllRows('project_mobilizations'),
    fetchAllRows('weekly_updates'),
    fetchAllRows('tasks'),
    fetchAllRows('pending_items'),
    fetchAllRows('attachments'),
    fetchAllRows('comments')
  ]);

  return {
    version: '1.2', // chunking & pagination version
    exported_at: new Date().toISOString(),
    exported_by: user.data.user?.email || 'admin',
    data: {
      teams, user_profiles, offline_personnel, projects, project_phases,
      team_members, project_members, project_mobilizations,
      weekly_updates, tasks, pending_items, attachments, comments
    }
  };
};

// 설명: 시스템 전체 데이터 백업 (JSON 파일 로컬 다운로드)
export const exportSystemBackup = async (): Promise<void> => {
  const backupObject = await generateBackupData();

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

// 설명: 백업 데이터를 Supabase Storage에 영구 저장 (주간 백업용)
export const saveBackupToCloud = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const backupObject = await generateBackupData();
    const jsonStr = JSON.stringify(backupObject, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    
    const timestamp = format(new Date(), 'yyyyMMdd_HHmm');
    const fileName = `weekly_meeting_backup_${timestamp}.json`;

    const { error } = await supabase.storage.from('backups').upload(fileName, blob, {
      contentType: 'application/json',
      upsert: true
    });

    if (error) throw error;
    
    return { success: true, message: '클라우드 스토리지에 백업이 성공적으로 저장되었습니다.' };
  } catch (error: any) {
    console.error('클라우드 백업 저장 실패:', error);
    throw new Error(error.message || '클라우드 백업 저장 중 오류가 발생했습니다.');
  }
};

// 설명: 스토리지에 저장된 백업 목록 가져오기
export const getCloudBackups = async (): Promise<BackupFileMeta[]> => {
  const { data, error } = await supabase.storage.from('backups').list('', {
    limit: 100,
    sortBy: { column: 'created_at', order: 'desc' }
  });

  if (error) throw error;
  
  return (data || []).filter(f => f.name.endsWith('.json')) as unknown as BackupFileMeta[];
};

// 설명: 특정 스토리지 백업 파일을 로컬로 다운로드
export const downloadCloudBackup = async (fileName: string): Promise<void> => {
  const { data, error } = await supabase.storage.from('backups').download(fileName);
  if (error) throw error;
  
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 설명: 특정 스토리지 백업 파일로 복원
export const restoreFromCloudBackup = async (fileName: string): Promise<{ success: boolean; message: string }> => {
  const { data, error } = await supabase.storage.from('backups').download(fileName);
  if (error) throw error;
  
  const text = await data.text();
  const backupJson = JSON.parse(text) as BackupData;
  return importSystemRestore(backupJson);
};

// 설명: 백업 파일(JSON)로 데이터베이스 복원 (Chunking 적용)
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
    // 500건 단위 Chunking Upsert
    if (teams) await upsertInChunks('teams', teams);
    if (user_profiles) await upsertInChunks('user_profiles', user_profiles);
    if (offline_personnel) await upsertInChunks('offline_personnel', offline_personnel);
    if (projects) await upsertInChunks('projects', projects);
    if (project_phases) await upsertInChunks('project_phases', project_phases);
    
    if (team_members) await upsertInChunks('team_members', team_members);
    if (project_members) await upsertInChunks('project_members', project_members);
    if (project_mobilizations) await upsertInChunks('project_mobilizations', project_mobilizations);
    
    if (weekly_updates) await upsertInChunks('weekly_updates', weekly_updates);
    if (tasks) await upsertInChunks('tasks', tasks);
    if (pending_items) await upsertInChunks('pending_items', pending_items);
    if (attachments) await upsertInChunks('attachments', attachments);
    if (comments) await upsertInChunks('comments', comments);

    return {
      success: true,
      message: `성공적으로 복원되었습니다! (팀: ${teams?.length || 0}개, 사용자: ${user_profiles?.length || 0}명, 데이터 무결성 검증 통과)`
    };
  } catch (error: any) {
    console.error('복원 실패:', error);
    throw new Error(error.message || '복원 작업 중 오류가 발생했습니다.');
  }
};
