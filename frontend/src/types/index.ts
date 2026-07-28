// 설명: 애플리케이션 전체에서 사용하는 TypeScript 타입 정의

// ========================================
// ENUM 타입 정의
// ========================================

// 작업 타입 (주요 진행사항, 이슈, 계획)
export type TaskType = 'progress' | 'issue' | 'plan';

// 작업 상태
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';

// Pending 항목 상태
export type PendingStatus = 'pending' | 'in_progress' | 'waiting' | 'completed' | 'cancelled';

// 우선순위
export type PriorityLevel = 'high' | 'medium' | 'low';

// 사용자 역할
export type UserRole = 'admin' | 'team_leader' | 'member';

// 주간 업데이트 상태
export type WeeklyUpdateStatus = 'draft' | 'submitted' | 'reviewed';

// 프로젝트 상태
export type ProjectStatus = 'active' | 'completed' | 'on_hold';

// 프로젝트 단계 상태
export type ProjectPhaseStatus = 'pending' | 'in_progress' | 'delayed' | 'ahead' | 'completed';

// ========================================
// 데이터베이스 테이블 타입 정의
// ========================================

// 팀 정보
export interface Team {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 프로젝트
export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// 프로젝트 마일스톤(단계)
export interface ProjectPhase {
  id: string;
  project_id: string;
  phase_name: string; // 설계, 구매, 제작, 검사, 설치, 시운전 등
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  status: ProjectPhaseStatus;
  required_personnel: number;
  display_order: number;
  created_at: string;
  updated_at: string;
  
  // 관계 데이터
  project?: Project;
}

// 프로젝트 투입 계획 (Mobilization)
export interface ProjectMobilization {
  id: string;
  project_id: string;
  user_id: string;
  phase_id: string | null;
  role_description: string | null;
  start_date: string;
  end_date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;

  // 관계 데이터
  project?: Project;
  user?: UserProfile;
  phase?: ProjectPhase;
}

// 사용자 프로필
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  team_id: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // 관계 데이터
  team?: Team;
}

// 주간 업데이트
export interface WeeklyUpdate {
  id: string;
  team_id: string | null;
  project_id?: string | null;
  week_start_date: string; // ISO 날짜 문자열
  week_end_date: string;
  created_by: string | null;
  last_updated_by: string | null;
  status: WeeklyUpdateStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // 관계 데이터
  team?: Team;
  project?: Project;
  creator?: UserProfile;
  last_updater?: UserProfile;
  tasks?: Task[];
}

// 작업 항목
export interface Task {
  id: string;
  weekly_update_id: string;
  project_id?: string | null;
  task_type: TaskType;
  title: string;
  description: string | null;
  progress_percentage: number;
  assigned_to: string | null;
  assignee_name?: string | null;
  is_carried_over?: boolean;
  status: TaskStatus;
  priority: PriorityLevel;
  due_date: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  
  // 관계 데이터
  weekly_update?: WeeklyUpdate;
  assignee?: UserProfile;
}

// Pending 항목
export interface PendingItem {
  id: string;
  item_id: string; // P001, P002 등
  team_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assignee_name?: string | null;
  is_carried_over?: boolean;
  created_by: string;
  registered_date: string;
  target_date: string | null;
  completed_date: string | null;
  status: PendingStatus;
  priority: PriorityLevel;
  is_completed: boolean;
  related_task_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // 관계 데이터
  team?: Team;
  assignee?: UserProfile;
  creator?: UserProfile;
  related_task?: Task;
}

// ========================================
// 폼 입력 타입 정의
// ========================================

// 주간 업데이트 생성/수정 입력
export interface WeeklyUpdateInput {
  team_id: string;
  week_start_date: string;
  week_end_date: string;
  status?: WeeklyUpdateStatus;
  notes?: string;
}

// 작업 항목 생성/수정 입력
export interface TaskInput {
  weekly_update_id: string;
  task_type: TaskType;
  title: string;
  description?: string;
  progress_percentage?: number;
  assigned_to?: string;
  assignee_name?: string;
  is_carried_over?: boolean;
  status?: TaskStatus;
  priority?: PriorityLevel;
  due_date?: string;
  display_order?: number;
}

// Pending 항목 생성/수정 입력
export interface PendingItemInput {
  team_id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  assignee_name?: string;
  registered_date?: string;
  target_date?: string;
  status?: PendingStatus;
  priority?: PriorityLevel;
  related_task_id?: string;
  notes?: string;
}

// ========================================
// UI 관련 타입 정의
// ========================================

// 대시보드 통계 데이터
export interface DashboardStats {
  total_teams: number;
  total_updates: number;
  total_pending: number;
  completed_pending: number;
  in_progress_pending: number;
  high_priority_pending: number;
}

// 팀별 진행 현황
export interface TeamProgress {
  team: Team;
  weekly_update?: WeeklyUpdate;
  progress_count: number;
  issue_count: number;
  plan_count: number;
  pending_count: number;
  completion_rate: number;
}

// 주간회의 리포트 데이터
export interface WeeklyMeetingReport {
  week_start: string;
  week_end: string;
  teams: TeamProgress[];
  critical_issues: Task[];
  high_priority_pending: PendingItem[];
  upcoming_plans: Task[];
}

// 필터 옵션
export interface FilterOptions {
  team_id?: string;
  status?: TaskStatus | PendingStatus;
  priority?: PriorityLevel;
  task_type?: TaskType;
  date_from?: string;
  date_to?: string;
}
