// ?ㅻ챸: ?좏뵆由ъ??댁뀡 ?꾩껜?먯꽌 ?ъ슜?섎뒗 TypeScript ????뺤쓽

// ========================================
// ENUM ????뺤쓽
// ========================================

// ?묒뾽 ???(二쇱슂 吏꾪뻾?ы빆, ?댁뒋, 怨꾪쉷)
export type TaskType = 'progress' | 'issue' | 'plan';

// ?묒뾽 ?곹깭
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';

// Pending ??ぉ ?곹깭
export type PendingStatus = 'pending' | 'in_progress' | 'waiting' | 'completed' | 'cancelled';

// ?곗꽑?쒖쐞
export type PriorityLevel = 'high' | 'medium' | 'low';

// ?ъ슜????븷
export type UserRole = 'admin' | 'team_leader' | 'member';

// 二쇨컙 ?낅뜲?댄듃 ?곹깭
export type WeeklyUpdateStatus = 'draft' | 'submitted' | 'reviewed';

// ?꾨줈?앺듃 ?곹깭
export type ProjectStatus = 'active' | 'completed' | 'on_hold';

// ?꾨줈?앺듃 ?④퀎 ?곹깭
export type ProjectPhaseStatus = 'pending' | 'in_progress' | 'delayed' | 'ahead' | 'completed';

// ========================================
// ?곗씠?곕쿋?댁뒪 ?뚯씠釉?????뺤쓽
// ========================================

// ? ?뺣낫
export interface Team {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ?꾨줈?앺듃
export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  display_order: number;
  
  created_at: string;
  updated_at: string;
}

// ?꾨줈?앺듃 留덉씪?ㅽ넠(?④퀎)
export interface ProjectPhase {
  id: string;
  project_id: string;
  phase_name: string; // ?ㅺ퀎, 援щℓ, ?쒖옉, 寃?? ?ㅼ튂, ?쒖슫????  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  status: ProjectPhaseStatus;
  required_personnel: number;
  display_order: number;
  
  created_at: string;
  updated_at: string;
  
  // 愿怨??곗씠??  project?: Project;
}

// ?꾨줈?앺듃 ?ъ엯 怨꾪쉷 (Mobilization)
export interface ProjectMobilization {
  id: string;
  project_id: string;
  user_id: string | null;
  offline_personnel_id: string | null;
  phase_id: string | null;
  role_description: string | null;
  start_date: string;
  end_date: string;
  
  created_at: string;
  updated_at: string;

  // 愿怨??곗씠??  project?: Project;
  user?: UserProfile;
  offline_personnel?: OfflinePersonnel;
  phase?: ProjectPhase;
}

// 泥⑤??뚯씪
export interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  content_type: string | null;
  entity_type: string; // 'task', 'update', 'project' ??  entity_id: string;
  uploaded_by: string | null;
  created_at: string;

  // 愿怨??곗씠??  uploader?: UserProfile;
}

// ?볤?
export interface Comment {
  id: string;
  content: string;
  entity_type: string;
  entity_id: string;
  author_id: string;
  created_at: string;
  updated_at: string;

  // 愿怨??곗씠??  author?: UserProfile;
}


// ?ㅽ봽?쇱씤 ?몃젰 (誘멸??????
export interface OfflinePersonnel {
  id: string;
  full_name: string;
  email?: string | null;
  team_id: string | null;
  role: string | null;
  
  created_at: string;
  updated_at: string;
  
  // 愿怨??곗씠??  team?: Team;
}

// ?ъ슜???꾨줈??export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  team_id: string | null; // Primary Team
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // 愿怨??곗씠??  team?: Team;
}

// ? ?ㅼ쨷 ?뚯냽 硫ㅻ쾭
export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  created_at: string;
  
  // 愿怨??곗씠??  team?: Team;
  user?: UserProfile;
}

// ?꾨줈?앺듃 ?ㅼ쨷 ?뚯냽 硫ㅻ쾭
export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  created_at: string;
  
  // 愿怨??곗씠??  project?: Project;
  user?: UserProfile;
}

// ?뚰겕濡쒕뱶 ?꾪솴 (?ъ슜?먮퀎 ?뚯냽 媛쒖닔)
export interface UserWorkload {
  user_id: string;
  full_name: string;
  email: string;
  primary_team_name: string | null;
  assigned_teams: Team[];
  assigned_projects: Project[];
  total_workload_count: number;
}

// 二쇨컙 ?낅뜲?댄듃
export interface WeeklyUpdate {
  id: string;
  team_id: string | null;
  project_id?: string | null;
  week_start_date: string; // ISO ?좎쭨 臾몄옄??  week_end_date: string;
  
  last_updated_by: string | null;
  status: WeeklyUpdateStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // 愿怨??곗씠??  team?: Team;
  project?: Project;
  creator?: UserProfile;
  last_updater?: UserProfile;
  tasks?: Task[];
}

// ?묒뾽 ??ぉ
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
  
  // 愿怨??곗씠??  weekly_update?: WeeklyUpdate;
  assignee?: UserProfile;
  attachments?: Attachment[];
  comments?: Comment[];
}

// Pending ??ぉ
export interface PendingItem {
  id: string;
  item_id: string; // P001, P002 ??  team_id: string;
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
  
  // 愿怨??곗씠??  team?: Team;
  assignee?: UserProfile;
  creator?: UserProfile;
  related_task?: Task;
}

// ========================================
// ???낅젰 ????뺤쓽
// ========================================

// 二쇨컙 ?낅뜲?댄듃 ?앹꽦/?섏젙 ?낅젰
export interface WeeklyUpdateInput {
  team_id?: string | null;
  project_id?: string | null;
  week_start_date: string;
  week_end_date: string;
  status?: WeeklyUpdateStatus;
  notes?: string;
}

// ?묒뾽 ??ぉ ?앹꽦/?섏젙 ?낅젰
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

// Pending ??ぉ ?앹꽦/?섏젙 ?낅젰
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
// UI 愿??????뺤쓽
// ========================================

// ??쒕낫???듦퀎 ?곗씠??export interface DashboardStats {
  total_teams: number;
  total_updates: number;
  total_pending: number;
  completed_pending: number;
  in_progress_pending: number;
  high_priority_pending: number;
}

// ?蹂?吏꾪뻾 ?꾪솴
export interface TeamProgress {
  team: Team;
  weekly_update?: WeeklyUpdate;
  progress_count: number;
  issue_count: number;
  plan_count: number;
  pending_count: number;
  completion_rate: number;
}

// 二쇨컙?뚯쓽 由ы룷???곗씠??export interface WeeklyMeetingReport {
  week_start: string;
  week_end: string;
  teams: TeamProgress[];
  critical_issues: Task[];
  high_priority_pending: PendingItem[];
  upcoming_plans: Task[];
}

// ?꾪꽣 ?듭뀡
export interface FilterOptions {
  team_id?: string;
  status?: TaskStatus | PendingStatus;
  priority?: PriorityLevel;
  task_type?: TaskType;
  date_from?: string;
  date_to?: string;
}

