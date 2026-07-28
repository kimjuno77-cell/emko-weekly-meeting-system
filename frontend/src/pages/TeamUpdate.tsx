// 설명: 팀별 주간 업데이트 작성 페이지 컴포넌트 (주차 선택, 지난주 미완료 항목 이관, 담당자 DB 선택, 2주간 비교)

import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getTeamById } from '@/services/teamService';
import {
  getWeeklyUpdateByTeamAndWeek,
  createWeeklyUpdate,
  getCurrentWeekDates,
  getPrevWeekDates,
  getNextWeekDates,
  getUnclosedTasksFromPrevWeek,
  changeWeeklyUpdateStatus
} from '@/services/weeklyUpdateService';
import { createTask, updateTask, deleteTask } from '@/services/taskService';
import { Team, WeeklyUpdate, Task, TaskType, TaskStatus, PriorityLevel, UserProfile } from '@/types';
import toast from 'react-hot-toast';
import {
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileEdit,
  Send,
  X,
  User,
  ArrowRightLeft,
  Sparkles,
  MessageSquare,
  Clock
} from 'lucide-react';
import { parseISO } from 'date-fns';
import TaskFeedback from '@/components/TaskFeedback';
import { useAuthStore } from '@/stores/authStore';

const TeamUpdate = () => {
  const { userProfile } = useAuthStore();
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [weeklyUpdate, setWeeklyUpdate] = useState<WeeklyUpdate | null>(null);
  const [prevWeeklyUpdate, setPrevWeeklyUpdate] = useState<WeeklyUpdate | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [unclosedPrevTasks, setUnclosedPrevTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // 주차 선택 상태 (기본값: 이번 주차 월요일)
  const defaultDates = getCurrentWeekDates();
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(defaultDates.weekStartDate);
  const [currentWeekEnd, setCurrentWeekEnd] = useState<string>(defaultDates.weekEndDate);

  // 2주간 비교 뷰 토글
  const [showComparison, setShowComparison] = useState(false);

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TaskType>('progress');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // 폼 입력 필드
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskProgress, setTaskProgress] = useState(0);
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskAssigneeName, setTaskAssigneeName] = useState('');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('pending');
  const [taskPriority, setTaskPriority] = useState<PriorityLevel>('medium');

  // 작업별 피드백 아코디언 상태
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (teamId) {
      fetchTeamAndWeeklyData(currentWeekStart);
    }
  }, [teamId, currentWeekStart]);

  const fetchTeamAndWeeklyData = async (weekStart: string) => {
    if (!teamId) return;
    try {
      setLoading(true);
      // 1. 팀 정보 가져오기
      const teamData = await getTeamById(teamId);
      setTeam(teamData);

      // 2. 전체 활성 팀원 목록 가져오기 (담당자 선택용 DB)
      const { data: memberData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name', { ascending: true });
      if (memberData) setMembers(memberData);

      // 3. 선택한 주차의 주간 업데이트 가져오기
      let updateData = await getWeeklyUpdateByTeamAndWeek(teamId, weekStart);

      // 이번주 계산
      const calculatedDates = getCurrentWeekDates(parseISO(weekStart));
      setCurrentWeekEnd(calculatedDates.weekEndDate);

      // 만약 해당 주차 보고서가 없으면 자동 임시 생성
      if (!updateData) {
        updateData = await createWeeklyUpdate({
          team_id: teamId,
          week_start_date: calculatedDates.weekStartDate,
          week_end_date: calculatedDates.weekEndDate,
          status: 'draft',
          notes: ''
        });
      }

      setWeeklyUpdate(updateData);
      setTasks(updateData.tasks || []);

      // 4. 지난주 주간 보고서 & 지난주 미완료(UNCLOSED) 항목 가져오기
      const prevDates = getPrevWeekDates(weekStart);
      const prevUpdateData = await getWeeklyUpdateByTeamAndWeek(teamId, prevDates.weekStartDate);
      setPrevWeeklyUpdate(prevUpdateData);

      const unclosed = await getUnclosedTasksFromPrevWeek(teamId, weekStart);
      setUnclosedPrevTasks(unclosed);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      toast.error('팀 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 주차 이동 헬퍼 함수
  const handlePrevWeek = () => {
    const prev = getPrevWeekDates(currentWeekStart);
    setCurrentWeekStart(prev.weekStartDate);
  };

  const handleNextWeek = () => {
    const next = getNextWeekDates(currentWeekStart);
    setCurrentWeekStart(next.weekStartDate);
  };

  const handleCurrentWeek = () => {
    const curr = getCurrentWeekDates();
    setCurrentWeekStart(curr.weekStartDate);
  };

  // 지난주 미완료 항목 이번주 진행으로 자동 이관(불러오기)
  const handleCarryOverTasks = async () => {
    if (!weeklyUpdate || unclosedPrevTasks.length === 0) return;
    try {
      let importedCount = 0;
      for (const t of unclosedPrevTasks) {
        // 이미 가져온 항목인지 중복 확인
        const isDuplicate = tasks.some((existing) => existing.title === t.title);
        if (!isDuplicate) {
          await createTask({
            weekly_update_id: weeklyUpdate.id,
            task_type: 'progress',
            title: `[이관] ${t.title}`,
            description: t.description || '',
            progress_percentage: t.progress_percentage || 0,
            assigned_to: t.assigned_to || undefined,
            assignee_name: t.assignee_name || undefined,
            is_carried_over: true,
            status: t.status === 'completed' ? 'in_progress' : t.status,
            priority: t.priority
          });
          importedCount++;
        }
      }

      if (importedCount > 0) {
        toast.success(`지난주 미완료 항목 ${importedCount}개가 이번주 실적으로 이관되었습니다!`);
        fetchTeamAndWeeklyData(currentWeekStart);
      } else {
        toast('모든 미완료 항목이 이미 이번주 목록에 존재합니다.', { icon: 'ℹ️' });
      }
    } catch (error) {
      console.error('이관 실패:', error);
      toast.error('지난주 항목 이관에 실패했습니다.');
    }
  };

  // 모달 열기 (등록)
  const openAddModal = (type: TaskType) => {
    setModalType(type);
    setEditingTask(null);
    setTaskTitle('');
    setTaskDesc('');
    setTaskProgress(0);
    setTaskAssigneeId(members[0]?.id || '');
    setTaskAssigneeName('');
    setTaskStatus(type === 'issue' ? 'blocked' : 'pending');
    setTaskPriority('medium');
    setIsModalOpen(true);
  };

  // 모달 열기 (수정)
  const openEditModal = (task: Task) => {
    setModalType(task.task_type);
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description || '');
    setTaskProgress(task.progress_percentage);
    setTaskAssigneeId(task.assigned_to || '');
    setTaskAssigneeName(task.assignee_name || '');
    setTaskStatus(task.status);
    setTaskPriority(task.priority);
    setIsModalOpen(true);
  };

  // 모달 닫기
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  // 작업 저장 (등록/수정)
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }
    if (!weeklyUpdate) return;

    // 선택된 담당자의 이름 텍스트 설정
    const selectedMember = members.find((m) => m.id === taskAssigneeId);
    const finalAssigneeName = taskAssigneeName.trim() || selectedMember?.full_name || selectedMember?.email || '';

    try {
      if (editingTask) {
        // 수정
        await updateTask(editingTask.id, {
          weekly_update_id: weeklyUpdate.id,
          task_type: modalType,
          title: taskTitle.trim(),
          description: taskDesc.trim(),
          progress_percentage: taskProgress,
          assigned_to: taskAssigneeId || undefined,
          assignee_name: finalAssigneeName,
          status: taskStatus,
          priority: taskPriority,
        });
        toast.success('작업이 수정되었습니다.');
      } else {
        // 등록
        await createTask({
          weekly_update_id: weeklyUpdate.id,
          task_type: modalType,
          title: taskTitle.trim(),
          description: taskDesc.trim(),
          progress_percentage: taskProgress,
          assigned_to: taskAssigneeId || undefined,
          assignee_name: finalAssigneeName,
          status: taskStatus,
          priority: taskPriority,
          display_order: tasks.length + 1,
        });
        toast.success('새 작업이 추가되었습니다.');
      }

      closeModal();
      fetchTeamAndWeeklyData(currentWeekStart);
    } catch (error) {
      console.error('작업 저장 실패:', error);
      toast.error('작업 저장에 실패했습니다.');
    }
  };

  // 작업 삭제
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('이 작업을 삭제하시겠습니까?')) return;
    try {
      await deleteTask(taskId);
      toast.success('작업이 삭제되었습니다.');
      fetchTeamAndWeeklyData(currentWeekStart);
    } catch (error) {
      console.error('삭제 실패:', error);
      toast.error('작업 삭제에 실패했습니다.');
    }
  };

  // 제출 상태 변경
  const handleSubmitReport = async (status: 'draft' | 'submitted') => {
    if (!weeklyUpdate) return;
    try {
      await changeWeeklyUpdateStatus(weeklyUpdate.id, status);
      setWeeklyUpdate({ ...weeklyUpdate, status });
      toast.success(status === 'submitted' ? '주간 보고서가 성공적으로 제출되었습니다!' : '임시 저장 모드로 변경되었습니다.');
    } catch (error) {
      toast.error('상태 변경 실패');
    }
  };

  const progressTasks = tasks.filter((t) => t.task_type === 'progress');
  const issueTasks = tasks.filter((t) => t.task_type === 'issue');
  const planTasks = tasks.filter((t) => t.task_type === 'plan');

  // 지난주 차주계획 항목
  const prevPlans = prevWeeklyUpdate?.tasks?.filter((t) => t.task_type === 'plan') || [];

  if (loading && !team) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 font-medium">팀 정보를 찾을 수 없습니다.</p>
        <Link to="/" className="mt-4 inline-block text-sky-600 font-bold hover:underline text-sm">
          ← 대시보드로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 상단 빵부순 네비게이션 & 주차 선택 헤더 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
            title="대시보드로 돌아가기"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-100">
                {team.name}
              </span>
              <span className="text-xs text-slate-400 font-semibold">{team.description}</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-1">주간 업무 작성 및 취합</h1>
          </div>
        </div>

        {/* 주간 Navigator (이전주 / 이번주 / 다음주 선택) */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/70">
          <button
            onClick={handlePrevWeek}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-xl shadow-xs transition flex items-center gap-1 text-xs font-bold"
            title="지난주 주차 보기"
          >
            <ChevronLeft className="h-4 w-4" /> 지난주
          </button>

          <button
            onClick={handleCurrentWeek}
            className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 ${
              currentWeekStart === defaultDates.weekStartDate
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" /> 이번주
          </button>

          <div className="px-3 py-1 text-xs font-bold text-slate-700 flex items-center gap-1">
            <span>{currentWeekStart}</span>
            <span className="text-slate-400">~</span>
            <span>{currentWeekEnd}</span>
          </div>

          <button
            onClick={handleNextWeek}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-xl shadow-xs transition flex items-center gap-1 text-xs font-bold"
            title="다음주 주차 보기"
          >
            다음주 <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 지난주 미완료(UNCLOSED) 항목 자동 불러오기 배너 */}
      {unclosedPrevTasks.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-amber-100/50 border border-amber-200/80 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-pulse-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                지난주 미완료(Unclosed) 작업 {unclosedPrevTasks.length}건 감지됨
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                지난주 작성한 업무 중 아직 완료되지 않은 항목이 있습니다. 버튼을 누르면 이번주 진행 업무로 자동 이관됩니다.
              </p>
            </div>
          </div>

          <button
            onClick={handleCarryOverTasks}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold rounded-xl shadow-md shadow-amber-500/20 transition active:scale-95 flex items-center gap-2 whitespace-nowrap"
          >
            <Clock className="h-4 w-4" /> 이번주 실적으로 자동 불러오기 ({unclosedPrevTasks.length}건)
          </button>
        </div>
      )}

      {/* 상단 액션 바 (2주간 비교 버튼 및 제출 버튼) */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <button
          onClick={() => setShowComparison(!showComparison)}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl border transition flex items-center gap-2 ${
            showComparison
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
              : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
          }`}
        >
          <ArrowRightLeft className="h-4 w-4" />
          {showComparison ? '2주간 비교 뷰 닫기' : '📊 지난주 🆚 이번주 2주간 비교 보기'}
        </button>

        <div className="flex items-center gap-3">
          {weeklyUpdate?.status === 'submitted' ? (
            <span className="inline-flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-extrabold rounded-xl border border-emerald-200 gap-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-500" /> 제출 완료됨
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-extrabold rounded-xl border border-amber-200 gap-1.5">
              <FileEdit className="h-4 w-4 text-amber-500" /> 작성 중 (Draft)
            </span>
          )}

          {weeklyUpdate?.status === 'submitted' ? (
            <button
              onClick={() => handleSubmitReport('draft')}
              className="px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            >
              수정 모드로 전환
            </button>
          ) : (
            <button
              onClick={() => handleSubmitReport('submitted')}
              className="px-4 py-2 text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5" /> 최종 제출하기
            </button>
          )}
        </div>
      </div>

      {/* 지난주 vs 이번주 2주간 비교 패널 (Toggle Panel) */}
      {showComparison && (
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-6 rounded-3xl text-white shadow-xl border border-white/10 space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-extrabold bg-indigo-500/30 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                2-WEEK COMPARISON MODE
              </span>
              <h2 className="text-lg font-extrabold mt-1">지난주 계획(Plan) 🆚 이번주 실적(Progress) 비교</h2>
            </div>
            <button onClick={() => setShowComparison(false)} className="text-slate-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 좌측: 지난주 차주 예정 (Plan) */}
            <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-3">
              <h3 className="text-xs font-extrabold text-sky-400 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> 지난주에 수립한 차주 계획 ({prevPlans.length}건)
              </h3>

              {prevPlans.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">지난주 차주 계획 데이터가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {prevPlans.map((p) => (
                    <div key={p.id} className="p-3 bg-white/10 rounded-xl text-xs space-y-1">
                      <p className="font-bold text-slate-100">{p.title}</p>
                      {p.description && <p className="text-slate-400 text-[11px]">{p.description}</p>}
                      <div className="flex items-center justify-between text-[10px] text-slate-300 pt-1">
                        <span>담당: {p.assignee_name || p.assignee?.full_name || '미지정'}</span>
                        <span className="text-sky-300 font-semibold">예정 진행률: {p.progress_percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 우측: 이번주 실제 수행 실적 (Progress) */}
            <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-3">
              <h3 className="text-xs font-extrabold text-emerald-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> 이번주 실제 진행 실적 ({progressTasks.length}건)
              </h3>

              {progressTasks.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">이번주 실적 항목이 아직 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {progressTasks.map((t) => (
                    <div key={t.id} className="p-3 bg-white/10 rounded-xl text-xs space-y-1.5 border border-white/5">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-100">{t.title}</p>
                        {t.is_carried_over && (
                          <span className="px-1.5 py-0.2 text-[9px] bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                            이관됨
                          </span>
                        )}
                      </div>
                      {t.description && <p className="text-slate-400 text-[11px]">{t.description}</p>}

                      {/* 진행률 바 */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white/20 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-400 h-full rounded-full"
                            style={{ width: `${t.progress_percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-300">{t.progress_percentage}%</span>
                      </div>

                      <div className="text-[10px] text-slate-400">
                        담당자: {t.assignee_name || t.assignee?.full_name || '미지정'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3개 주간 작업 영역 (1. 금주 주요 실적 / 2. 이슈 및 지원사항 / 3. 차주 예정 계획) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. 금주 주요 진행사항 (Progress) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <span className="h-3 w-3 bg-sky-500 rounded-full"></span>
              금주 주요 진행사항 ({progressTasks.length})
            </h2>
            <button
              onClick={() => openAddModal('progress')}
              className="p-1.5 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-xl transition"
              title="추가"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 min-h-[160px]">
            {progressTasks.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">등록된 주요 진행사항이 없습니다.</p>
            ) : (
              progressTasks.map((task) => (
                <TaskCard key={task.id} task={task} onEdit={openEditModal} onDelete={handleDeleteTask} />
              ))
            )}
          </div>
        </div>

        {/* 2. 주요 이슈 및 리스크 (Issue) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <span className="h-3 w-3 bg-rose-500 rounded-full"></span>
              주요 이슈 및 리스크 ({issueTasks.length})
            </h2>
            <button
              onClick={() => openAddModal('issue')}
              className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition"
              title="추가"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 min-h-[160px]">
            {issueTasks.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">특이 이슈 및 리스크가 없습니다. 👍</p>
            ) : (
              issueTasks.map((task) => (
                <TaskCard key={task.id} task={task} onEdit={openEditModal} onDelete={handleDeleteTask} />
              ))
            )}
          </div>
        </div>

        {/* 3. 차주 진행 계획 (Plan) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <span className="h-3 w-3 bg-indigo-500 rounded-full"></span>
              차주 예정 업무 ({planTasks.length})
            </h2>
            <button
              onClick={() => openAddModal('plan')}
              className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition"
              title="추가"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 min-h-[160px]">
            {planTasks.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">등록된 차주 계획이 없습니다.</p>
            ) : (
              planTasks.map((task) => (
                <TaskCard key={task.id} task={task} onEdit={openEditModal} onDelete={handleDeleteTask} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* 작업 입력/수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-zoomIn">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm">
                {editingTask ? '작업 항목 수정' : '새 작업 항목 추가'} (
                {modalType === 'progress' ? '주요 실적' : modalType === 'issue' ? '이슈사항' : '차주 계획'})
              </h3>
              <button onClick={closeModal} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">작업 제목 *</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="예: 고객사 시스템 기능 연동 테스트 완료"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">상세 내용 (선택)</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="세부 추진 내용 및 현황 정보"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* 담당자 DB 선택 드롭다운 + 커스텀 담당자 입력 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">담당자 (시스템 DB)</label>
                  <select
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">직접 입력 또는 미지정</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name || m.email} ({m.team?.name || '팀'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">담당자 이름 (직접 수정/입력)</label>
                  <input
                    type="text"
                    value={taskAssigneeName}
                    onChange={(e) => setTaskAssigneeName(e.target.value)}
                    placeholder="예: 김철수 과장"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">진행률 ({taskProgress}%)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={taskProgress}
                    onChange={(e) => setTaskProgress(parseInt(e.target.value))}
                    className="w-full accent-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">상태</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="pending">대기 (Pending)</option>
                    <option value="in_progress">진행 중 (In Progress)</option>
                    <option value="completed">완료 (Completed)</option>
                    <option value="blocked">지연/리스크 (Blocked)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-extrabold rounded-xl transition shadow-md shadow-sky-500/20"
                >
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// 개별 작업 카드 컴포넌트
const TaskCard = ({
  task,
  onEdit,
  onDelete
}: {
  task: Task;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
}) => {
  return (
    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-200 hover:shadow-md transition space-y-2 group">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-extrabold text-slate-900 text-xs">{task.title}</h4>
            {task.is_carried_over && (
              <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-100 text-amber-800 rounded border border-amber-200">
                지난주 이관
              </span>
            )}
          </div>
          {task.description && <p className="text-[11px] text-slate-500 line-clamp-2">{task.description}</p>}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(task)}
            className="p-1 text-slate-400 hover:text-sky-600 hover:bg-slate-100 rounded transition"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 진행률 바 */}
      <div className="flex items-center gap-2 pt-1">
        <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              task.status === 'completed'
                ? 'bg-emerald-500'
                : task.status === 'blocked'
                ? 'bg-rose-500'
                : 'bg-sky-500'
            }`}
            style={{ width: `${task.progress_percentage}%` }}
          ></div>
        </div>
        <span className="text-[10px] font-extrabold text-slate-600">{task.progress_percentage}%</span>
      </div>

      {/* 하단 담당자 정보 */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100/80">
        <span className="flex items-center gap-1 font-semibold text-slate-600">
          <User className="h-3 w-3 text-slate-400" />
          {task.assignee_name || task.assignee?.full_name || '담당자 미지정'}
        </span>
        <span className="capitalize text-[10px] font-bold text-slate-500">{task.status}</span>
      </div>
    </div>
  );
};

export default TeamUpdate;
