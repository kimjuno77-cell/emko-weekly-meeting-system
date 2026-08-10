// ?ㅻ챸: ?蹂?二쇨컙 ?낅뜲?댄듃 ?묒꽦 ?섏씠吏 而댄룷?뚰듃 (二쇱감 ?좏깮, 吏?쒖＜ 誘몄셿猷???ぉ ?닿?, ?대떦??DB ?좏깮, 2二쇨컙 鍮꾧탳)

import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getAllTeams, getTeamById } from '@/services/teamService';
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
import { createPendingItem } from '@/services/pendingService';
import { Team, Project, WeeklyUpdate, Task, TaskType, TaskStatus, PriorityLevel, UserProfile } from '@/types';
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
  Info,
  Clock
} from 'lucide-react';
import { parseISO } from 'date-fns';
import TaskFeedback from '@/components/TaskFeedback';
import { useAuthStore } from '@/stores/authStore';

const TeamUpdate = () => {
  const { userProfile } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTeamId = searchParams.get('teamId');
  const urlProjectId = searchParams.get('projectId');

  const safeInitialTeamId = (urlTeamId && urlTeamId !== 'undefined' && urlTeamId !== 'null') ? urlTeamId : '';
  const safeInitialProjectId = (urlProjectId && urlProjectId !== 'undefined' && urlProjectId !== 'null') ? urlProjectId : '';

  const [selectedTeamId, setSelectedTeamId] = useState<string>(safeInitialTeamId);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(safeInitialProjectId);

  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  
  const [team, setTeam] = useState<Team | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [weeklyUpdate, setWeeklyUpdate] = useState<WeeklyUpdate | null>(null);
  const [prevWeeklyUpdate, setPrevWeeklyUpdate] = useState<WeeklyUpdate | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [unclosedPrevTasks, setUnclosedPrevTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // 二쇱감 ?좏깮 ?곹깭 (湲곕낯媛? ?대쾲 二쇱감 ?붿슂??
  const defaultDates = getCurrentWeekDates();
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(defaultDates.weekStartDate);
  const [currentWeekEnd, setCurrentWeekEnd] = useState<string>(defaultDates.weekEndDate);

  // 2二쇨컙 鍮꾧탳 酉??좉?
  const [showComparison, setShowComparison] = useState(false);

  // 紐⑤떖 ?곹깭
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TaskType>('progress');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // ???낅젰 ?꾨뱶
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskProgress, setTaskProgress] = useState(0);
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskAssigneeName, setTaskAssigneeName] = useState('');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('pending');
  const [taskPriority, setTaskPriority] = useState<PriorityLevel>('medium');
  const [isPendingTrack, setIsPendingTrack] = useState(false);
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);

  // ?묒뾽蹂??쇰뱶諛??꾩퐫?붿뼵 ?곹깭
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (isInitialDataLoaded) {
      fetchWeeklyData(currentWeekStart, selectedTeamId, selectedProjectId);
    }
  }, [currentWeekStart, selectedTeamId, selectedProjectId, isInitialDataLoaded]);

  const handleEntityChange = (type: 'team' | 'project', id: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (id) {
      newParams.set(type === 'team' ? 'teamId' : 'projectId', id);
    } else {
      newParams.delete(type === 'team' ? 'teamId' : 'projectId');
    }

    // ?꾨줈?앺듃 ?꾨떞? ?먮룞 留ㅽ븨 濡쒖쭅
    if (type === 'team' && id) {
      const team = allTeams.find(t => t.id === id);
      if (team) {
        const matchedProject = allProjects.find(p => p.name === team.name);
        if (matchedProject) {
          newParams.set('projectId', matchedProject.id);
          setSelectedProjectId(matchedProject.id);
        }
      }
    }

    setSearchParams(newParams);
    if (type === 'team') setSelectedTeamId(id);
    if (type === 'project') setSelectedProjectId(id);
  };

  const fetchInitialData = async () => {
    try {
      const [teamsData, { data: projectsData }] = await Promise.all([
        getAllTeams(),
        supabase.from('projects').select('*').order('display_order', { ascending: true }).order('name', { ascending: true })
      ]);
      setAllTeams(teamsData);
      setAllProjects(projectsData || []);
      
      // 珥덇린 URL 濡쒕뱶 ???먮룞 留ㅽ븨 濡쒖쭅 異붽?
      if (safeInitialTeamId) {
        const team = teamsData.find(t => t.id === safeInitialTeamId);
        if (team) {
          const matchedProject = projectsData?.find(p => p.name === team.name);
          // URL??projectId媛 紐낆떆?섏뼱 ?덉? ?딆? 寃쎌슦?먮쭔 ?먮룞 留ㅽ븨
          if (matchedProject && !safeInitialProjectId) {
            setSelectedProjectId(matchedProject.id);
            
            // URL ?뚮씪誘명꽣???낅뜲?댄듃
            const newParams = new URLSearchParams(searchParams);
            newParams.set('projectId', matchedProject.id);
            setSearchParams(newParams);
          } else if (!safeInitialProjectId) {
            // ?대쫫???쇱튂?섎뒗 ?꾨줈?앺듃媛 ?놁뼱?? ?대떦 ???理쒓렐 ?묒꽦???꾨줈?앺듃媛 ?덈떎硫??먮룞 ?좏깮 (怨듯넻?낅Т? ?몄쓽??
            const { data: recentUpdate } = await supabase
              .from('weekly_updates')
              .select('project_id')
              .eq('team_id', team.id)
              .not('project_id', 'is', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (recentUpdate && recentUpdate.project_id) {
              const recentProj = projectsData?.find(p => p.id === recentUpdate.project_id);
              if (recentProj) {
                setSelectedProjectId(recentProj.id);
                
                const newParams = new URLSearchParams(searchParams);
                newParams.set('projectId', recentProj.id);
                setSearchParams(newParams);
              }
            }
          }
        }
      }

      const { data: memberData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name', { ascending: true });
      if (memberData) setMembers(memberData);
    } catch (error) {
      console.error('湲곗큹 ?곗씠??濡쒕뱶 ?ㅽ뙣:', error);
      toast.error('湲곗큹 ?곗씠?곕? 遺덈윭?ㅻ뒗???ㅽ뙣?덉뒿?덈떎.');
    } finally {
      setIsInitialDataLoaded(true);
    }
  };

  const fetchWeeklyData = async (weekStart: string, tId: string, pId: string) => {
    if (!tId && !pId) {
      setWeeklyUpdate(null);
      setTasks([]);
      setPrevWeeklyUpdate(null);
      setUnclosedPrevTasks([]);
      setTeam(null);
      setProject(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const tIdNullSafe = tId || null;
      const pIdNullSafe = pId || null;

      if (tIdNullSafe) {
        const teamData = await getTeamById(tIdNullSafe);
        setTeam(teamData);
      } else {
        setTeam(null);
      }

      if (pIdNullSafe) {
        const { data: projectData } = await supabase.from('projects').select('*').eq('id', pIdNullSafe).single();
        setProject(projectData);
      } else {
        setProject(null);
      }

      // ?좏깮??二쇱감??二쇨컙 ?낅뜲?댄듃 媛?몄삤湲?
      let updateData = await getWeeklyUpdateByTeamAndWeek(tIdNullSafe, weekStart, pIdNullSafe);

      // ?대쾲二?怨꾩궛
      const calculatedDates = getCurrentWeekDates(parseISO(weekStart));
      setCurrentWeekEnd(calculatedDates.weekEndDate);

      // 留뚯빟 ?대떦 二쇱감 蹂닿퀬?쒓? ?놁쑝硫??먮룞 ?꾩떆 ?앹꽦
      if (!updateData) {
        updateData = await createWeeklyUpdate({
          team_id: tIdNullSafe,
          project_id: pIdNullSafe,
          week_start_date: calculatedDates.weekStartDate,
          week_end_date: calculatedDates.weekEndDate,
          status: 'draft',
          notes: ''
        });
      }

      setWeeklyUpdate(updateData);
      setTasks(updateData.tasks || []);

      // 吏?쒖＜ 二쇨컙 蹂닿퀬??& 吏?쒖＜ 誘몄셿猷?UNCLOSED) ??ぉ 媛?몄삤湲?
      const prevDates = getPrevWeekDates(weekStart);
      const prevUpdateData = await getWeeklyUpdateByTeamAndWeek(tIdNullSafe, prevDates.weekStartDate, pIdNullSafe);
      setPrevWeeklyUpdate(prevUpdateData);

      const unclosed = await getUnclosedTasksFromPrevWeek(tIdNullSafe, weekStart, pIdNullSafe);
      setUnclosedPrevTasks(unclosed);
    } catch (error) {
      console.error('?곗씠??濡쒕뱶 ?ㅽ뙣:', error);
      toast.error('二쇨컙 ?낅뜲?댄듃 ?곗씠?곕? 遺덈윭?ㅻ뒗???ㅽ뙣?덉뒿?덈떎.');
    } finally {
      setLoading(false);
    }
  };

  // 二쇱감 ?대룞 ?ы띁 ?⑥닔
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

  // 吏?쒖＜ 誘몄셿猷???ぉ ?대쾲二?吏꾪뻾?쇰줈 ?먮룞 ?닿?(遺덈윭?ㅺ린)
  const handleCarryOverTasks = async () => {
    if (!weeklyUpdate || unclosedPrevTasks.length === 0) return;
    try {
      let importedCount = 0;
      for (const t of unclosedPrevTasks) {
        // ?대? 媛?몄삩 ??ぉ?몄? 以묐났 ?뺤씤
        const isDuplicate = tasks.some((existing) => existing.title === t.title);
        if (!isDuplicate) {
          await createTask({
            weekly_update_id: weeklyUpdate.id,
            task_type: 'progress',
            title: `[?닿?] ${t.title}`,
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
        toast.success(`吏?쒖＜ 誘몄셿猷???ぉ ${importedCount}媛쒓? ?대쾲二??ㅼ쟻?쇰줈 ?닿??섏뿀?듬땲??`);
        fetchWeeklyData(currentWeekStart, selectedTeamId, selectedProjectId);
      } else {
        toast('紐⑤뱺 誘몄셿猷???ぉ???대? ?대쾲二?紐⑸줉??議댁옱?⑸땲??', { icon: '?뱄툘' });
      }
    } catch (error) {
      console.error('?닿? ?ㅽ뙣:', error);
      toast.error('吏?쒖＜ ??ぉ ?닿????ㅽ뙣?덉뒿?덈떎.');
    }
  };

  // 紐⑤떖 ?닿린 (?깅줉)
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
    setIsPendingTrack(type === 'issue');
    setIsModalOpen(true);
  };

  // 紐⑤떖 ?닿린 (?섏젙)
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
    setIsPendingTrack(false);
    setIsModalOpen(true);
  };

  // 紐⑤떖 ?リ린
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  // ?묒뾽 ???(?깅줉/?섏젙)
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.error('?쒕ぉ???낅젰?댁＜?몄슂.');
      return;
    }
    if (!weeklyUpdate) return;

    // ?좏깮???대떦?먯쓽 ?대쫫 ?띿뒪???ㅼ젙
    const selectedMember = members.find((m) => m.id === taskAssigneeId);
    const finalAssigneeName = taskAssigneeName.trim() || selectedMember?.full_name || selectedMember?.email || '';

    try {
      if (editingTask) {
        // ?섏젙
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
        toast.success('?묒뾽???섏젙?섏뿀?듬땲??');
      } else {
        // ?깅줉
        const newTask = await createTask({
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
        
        if (isPendingTrack && newTask && selectedTeamId) {
          try {
            let initialPendingStatus = 'pending';
            if (taskStatus === 'in_progress') initialPendingStatus = 'in_progress';
            else if (taskStatus === 'completed') initialPendingStatus = 'completed';
            else if (taskStatus === 'blocked') initialPendingStatus = 'waiting';
            else if (taskStatus === 'cancelled') initialPendingStatus = 'cancelled';

            await createPendingItem({
              team_id: selectedTeamId,
              title: taskTitle.trim(),
              description: taskDesc.trim(),
              assigned_to: taskAssigneeId || undefined,
              assignee_name: finalAssigneeName,
              status: initialPendingStatus as any,
              priority: taskPriority,
              related_task_id: newTask.id,
              notes: '二쇨컙 ?낅Т ?뚯쓽濡앹뿉???먮룞 ?곕룞??
            });
            toast.success('???묒뾽怨??④퍡 Pending ?꾩븞???깅줉?섏뿀?듬땲??');
          } catch(err) {
            console.error('Pending ?곕룞 ?ㅽ뙣:', err);
            toast.error('?묒뾽? ?깅줉?섏뿀?쇰굹 Pending ?곕룞???ㅽ뙣?덉뒿?덈떎.');
          }
        } else {
          toast.success('???묒뾽??異붽??섏뿀?듬땲??');
        }
      }

      closeModal();
      fetchWeeklyData(currentWeekStart, selectedTeamId, selectedProjectId);
    } catch (error) {
      console.error('?묒뾽 ????ㅽ뙣:', error);
      toast.error(error instanceof Error ? error.message : '?묒뾽 ??μ뿉 ?ㅽ뙣?덉뒿?덈떎.');
    }
  };

  // ?묒뾽 ??젣
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('???묒뾽????젣?섏떆寃좎뒿?덇퉴?')) return;
    try {
      await deleteTask(taskId);
      toast.success('?묒뾽????젣?섏뿀?듬땲??');
      fetchWeeklyData(currentWeekStart, selectedTeamId, selectedProjectId);
    } catch (error) {
      console.error('??젣 ?ㅽ뙣:', error);
      toast.error('?묒뾽 ??젣???ㅽ뙣?덉뒿?덈떎.');
    }
  };

  // ?쒖텧 ?곹깭 蹂寃?
  const handleSubmitReport = async (status: 'draft' | 'submitted') => {
    if (!weeklyUpdate) return;
    try {
      await changeWeeklyUpdateStatus(weeklyUpdate.id, status);
      setWeeklyUpdate({ ...weeklyUpdate, status });
      toast.success(status === 'submitted' ? '二쇨컙 蹂닿퀬?쒓? ?깃났?곸쑝濡??쒖텧?섏뿀?듬땲??' : '?꾩떆 ???紐⑤뱶濡?蹂寃쎈릺?덉뒿?덈떎.');
    } catch (error) {
      toast.error('?곹깭 蹂寃??ㅽ뙣');
    }
  };

  const progressTasks = tasks.filter((t) => t.task_type === 'progress');
  const issueTasks = tasks.filter((t) => t.task_type === 'issue');
  const planTasks = tasks.filter((t) => t.task_type === 'plan');

  // 吏?쒖＜ 李⑥＜怨꾪쉷 ??ぉ
  const prevPlans = prevWeeklyUpdate?.tasks?.filter((t) => t.task_type === 'plan') || [];

  if (loading && (!team && !project)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  // ?쇰컲 ?(?대쫫??'?'?쇰줈 ?앸굹??寃쎌슦) ?щ? ?먮떒
  const selectedTeamData = allTeams.find(t => t.id === selectedTeamId);
  const isCommonTeam = selectedTeamData ? selectedTeamData.name.endsWith('?') : false;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 二쇨컙?낅Т ?묒꽦 媛?대뱶 */}
      <div className="bg-sky-50/50 border border-sky-100 p-4 rounded-2xl flex gap-3 items-start shadow-sm">
        <Info className="h-5 w-5 text-sky-600 mt-0.5 shrink-0" />
        <div className="text-sm text-sky-900 space-y-1 leading-relaxed">
          <p className="font-bold">?뱷 二쇨컙?낅Т ?묒꽦 媛?대뱶</p>
          <ul className="list-disc list-inside text-sky-800 space-y-0.5 opacity-90 pl-1">
            <li><strong>?꾨줈?앺듃 ?꾨떞 ?:</strong> ? ?좏깮留??섏떆硫??꾨줈?앺듃媛 ?먮룞 留ㅽ븨?섏뼱 蹂꾨룄濡??꾨줈?앺듃瑜??좏깮?섏떎 ?꾩슂媛 ?놁뒿?덈떎.</li>
            <li><strong>怨듯넻?낅Т ? (?? 湲곗닠?덉쭏? ??:</strong> ????좏깮?섏떊 ?? ?곗륫??<strong>[?꾨줈?앺듃 吏곸젒 ?낅젰]</strong> ??먯꽌 ?대떦?섏떆???뱀젙 ?꾨줈?앺듃瑜??좏깮?섏뿬 ?낅Т瑜?遺꾨━ ?묒꽦??二쇱꽭??</li>
          </ul>
        </div>
      </div>

      {/* ?곷떒 ?ㅻ퉬寃뚯씠??& 二쇱감 ?좏깮 ?ㅻ뜑 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <Link
            to="/"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
            title="??쒕낫?쒕줈 ?뚯븘媛湲?
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <select
              value={selectedTeamId}
              onChange={(e) => handleEntityChange('team', e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50"
            >
              <option value="">? ?좏깮 ?놁쓬</option>
              {allTeams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            {isCommonTeam ? (
              <>
                <span className="text-slate-300 font-bold hidden md:block">+</span>

                <select
                  value={selectedProjectId}
                  onChange={(e) => handleEntityChange('project', e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 min-w-[200px]"
                >
                  <option value="">-- ?깅줉???꾨줈?앺듃 ?좏깮 ({allProjects.length}媛? --</option>
                  {allProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </>
            ) : (
              selectedTeamData && (
                <div className="px-3 py-2 bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-inner">
                  <Sparkles className="w-4 h-4" /> ?꾨줈?앺듃 ?먮룞 留ㅽ븨??
                </div>
              )
            )}
          </div>
        </div>

        {/* 二쇨컙 Navigator (?댁쟾二?/ ?대쾲二?/ ?ㅼ쓬二??좏깮) */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/70">
          <button
            onClick={handlePrevWeek}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-xl shadow-xs transition flex items-center gap-1 text-xs font-bold"
            title="吏?쒖＜ 二쇱감 蹂닿린"
          >
            <ChevronLeft className="h-4 w-4" /> 吏?쒖＜
          </button>

          <button
            onClick={handleCurrentWeek}
            className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 ${
              currentWeekStart === defaultDates.weekStartDate
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" /> ?대쾲二?
          </button>

          <div className="px-3 py-1 text-xs font-bold text-slate-700 flex items-center gap-1">
            <span>{currentWeekStart}</span>
            <span className="text-slate-400">~</span>
            <span>{currentWeekEnd}</span>
          </div>

          <button
            onClick={handleNextWeek}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-xl shadow-xs transition flex items-center gap-1 text-xs font-bold"
            title="?ㅼ쓬二?二쇱감 蹂닿린"
          >
            ?ㅼ쓬二?<ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {(!selectedTeamId && !selectedProjectId) ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 font-medium">?곷떒?먯꽌 ? ?먮뒗 ?꾨줈?앺듃瑜??좏깮?댁＜?몄슂.</p>
        </div>
      ) : (
        <>
          {/* 吏?쒖＜ 誘몄셿猷?UNCLOSED) ??ぉ ?먮룞 遺덈윭?ㅺ린 諛곕꼫 */}
          {unclosedPrevTasks.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-amber-100/50 border border-amber-200/80 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-pulse-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                吏?쒖＜ 誘몄셿猷?Unclosed) ?묒뾽 {unclosedPrevTasks.length}嫄?媛먯???
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                吏?쒖＜ ?묒꽦???낅Т 以??꾩쭅 ?꾨즺?섏? ?딆? ??ぉ???덉뒿?덈떎. 踰꾪듉???꾨Ⅴ硫??대쾲二?吏꾪뻾 ?낅Т濡??먮룞 ?닿??⑸땲??
              </p>
            </div>
          </div>

          <button
            onClick={handleCarryOverTasks}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold rounded-xl shadow-md shadow-amber-500/20 transition active:scale-95 flex items-center gap-2 whitespace-nowrap"
          >
            <Clock className="h-4 w-4" /> ?대쾲二??ㅼ쟻?쇰줈 ?먮룞 遺덈윭?ㅺ린 ({unclosedPrevTasks.length}嫄?
          </button>
        </div>
      )}

      {/* ?곷떒 ?≪뀡 諛?(2二쇨컙 鍮꾧탳 踰꾪듉 諛??쒖텧 踰꾪듉) */}
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
          {showComparison ? '2二쇨컙 鍮꾧탳 酉??リ린' : '?뱤 吏?쒖＜ ?넎 ?대쾲二?2二쇨컙 鍮꾧탳 蹂닿린'}
        </button>

        <div className="flex items-center gap-3">
          {weeklyUpdate?.status === 'submitted' ? (
            <span className="inline-flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-extrabold rounded-xl border border-emerald-200 gap-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-500" /> ?쒖텧 ?꾨즺??
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-extrabold rounded-xl border border-amber-200 gap-1.5">
              <FileEdit className="h-4 w-4 text-amber-500" /> ?묒꽦 以?(Draft)
            </span>
          )}

          {weeklyUpdate?.status === 'submitted' ? (
            <button
              onClick={() => handleSubmitReport('draft')}
              className="px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            >
              ?섏젙 紐⑤뱶濡??꾪솚
            </button>
          ) : (
            <button
              onClick={() => handleSubmitReport('submitted')}
              className="px-4 py-2 text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5" /> 理쒖쥌 ?쒖텧?섍린
            </button>
          )}
        </div>
      </div>

      {/* 吏?쒖＜ vs ?대쾲二?2二쇨컙 鍮꾧탳 ?⑤꼸 (Toggle Panel) */}
      {showComparison && (
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-6 rounded-3xl text-white shadow-xl border border-white/10 space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-extrabold bg-indigo-500/30 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                2-WEEK COMPARISON MODE
              </span>
              <h2 className="text-lg font-extrabold mt-1">吏?쒖＜ 怨꾪쉷(Plan) ?넎 ?대쾲二??ㅼ쟻(Progress) 鍮꾧탳</h2>
            </div>
            <button onClick={() => setShowComparison(false)} className="text-slate-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 醫뚯륫: 吏?쒖＜ 李⑥＜ ?덉젙 (Plan) */}
            <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-3">
              <h3 className="text-xs font-extrabold text-sky-400 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> 吏?쒖＜???섎┰??李⑥＜ 怨꾪쉷 ({prevPlans.length}嫄?
              </h3>

              {prevPlans.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">吏?쒖＜ 李⑥＜ 怨꾪쉷 ?곗씠?곌? ?놁뒿?덈떎.</p>
              ) : (
                <div className="space-y-2">
                  {prevPlans.map((p) => (
                    <div key={p.id} className="p-3 bg-white/10 rounded-xl text-xs space-y-1">
                      <p className="font-bold text-slate-100">{p.title}</p>
                      {p.description && <p className="text-slate-400 text-[11px]">{p.description}</p>}
                      <div className="flex items-center justify-between text-[10px] text-slate-300 pt-1">
                        <span>?대떦: {p.assignee_name || p.assignee?.full_name || '誘몄???}</span>
                        <span className="text-sky-300 font-semibold">?덉젙 吏꾪뻾瑜? {p.progress_percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ?곗륫: ?대쾲二??ㅼ젣 ?섑뻾 ?ㅼ쟻 (Progress) */}
            <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-3">
              <h3 className="text-xs font-extrabold text-emerald-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> ?대쾲二??ㅼ젣 吏꾪뻾 ?ㅼ쟻 ({progressTasks.length}嫄?
              </h3>

              {progressTasks.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">?대쾲二??ㅼ쟻 ??ぉ???꾩쭅 ?놁뒿?덈떎.</p>
              ) : (
                <div className="space-y-2">
                  {progressTasks.map((t) => (
                    <div key={t.id} className="p-3 bg-white/10 rounded-xl text-xs space-y-1.5 border border-white/5">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-100">{t.title}</p>
                        {t.is_carried_over && (
                          <span className="px-1.5 py-0.2 text-[9px] bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                            ?닿???
                          </span>
                        )}
                      </div>
                      {t.description && <p className="text-slate-400 text-[11px]">{t.description}</p>}

                      {/* 吏꾪뻾瑜?諛?*/}
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
                        ?대떦?? {t.assignee_name || t.assignee?.full_name || '誘몄???}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ?묒꽦 媛?대뱶 (HRSG SCR ?⑦궎吏 ?ㅺ퀎?낆껜 ?덉떆) */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
        <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-3">
          <Info className="h-4 w-4 text-sky-500" /> 二쇨컙 ?뚯쓽 蹂닿퀬???묒꽦 媛?대뱶
        </h3>
        <div className="text-xs text-slate-600 space-y-2">
          <p><strong>?묒꽦 ?먯튃:</strong> ?낅Т???듭떖 ?꾩＜濡?紐낇솗?섍쾶 ?묒꽦?섎ŉ, 援ъ껜?곸씤 吏꾪뻾瑜?%)怨??대떦?먮? 諛섎뱶??紐낆떆??二쇱꽭??</p>
          <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-3 mt-3">
            <p className="font-bold text-slate-700">?뮕 [?덉떆] HRSG SCR ?⑦궎吏 ?ㅺ퀎?낆껜 (?꾨줈?앺듃 TF?)</p>
            <ul className="list-disc list-inside space-y-2 pl-1 text-slate-600">
              <li>
                <span className="font-semibold text-sky-600">[湲덉＜ 二쇱슂 ?ㅼ쟻]</span> 
                {' '}SCR Reactor 湲곕낯 ?ㅺ퀎(Basic Engineering) ?꾨㈃ 珥덉븞 ?묒꽦 (吏꾪뻾瑜?80%) / 珥됰ℓ(Catalyst) 怨듦툒?낆껜 1李?誘명똿 ?꾨즺
              </li>
              <li>
                <span className="font-semibold text-rose-500">[二쇱슂 ?댁뒋/?ν빐]</span> 
                {' '}諛곗븬(Back pressure) 利앷?濡??명븳 ?좊룞 ?댁꽍(CFD) ?ш????꾩슂. (?뱀씤 ?쇱젙 1二?吏??由ъ뒪??
              </li>
              <li>
                <span className="font-semibold text-emerald-600">[李⑥＜ ?덉젙 怨꾪쉷]</span> 
                {' '}?좊룞 ?댁꽍 理쒖쟻??紐⑤뜽 ?꾩텧 諛?諛쒖＜泥??뱀씤(Approval)???꾨㈃ 理쒖쥌 ?쒖텧
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 3媛?二쇨컙 ?묒뾽 ?곸뿭 (1. 湲덉＜ 二쇱슂 ?ㅼ쟻 / 2. ?댁뒋 諛?吏?먯궗??/ 3. 李⑥＜ ?덉젙 怨꾪쉷) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. 湲덉＜ 二쇱슂 吏꾪뻾?ы빆 (Progress) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <span className="h-3 w-3 bg-sky-500 rounded-full"></span>
              湲덉＜ 二쇱슂 吏꾪뻾?ы빆 ({progressTasks.length})
            </h2>
            <button
              onClick={() => openAddModal('progress')}
              className="p-1.5 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-xl transition"
              title="異붽?"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 min-h-[160px]">
            {progressTasks.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">?깅줉??二쇱슂 吏꾪뻾?ы빆???놁뒿?덈떎.</p>
            ) : (
              progressTasks.map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onEdit={openEditModal} 
                  onDelete={handleDeleteTask}
                  expandedTaskId={expandedTaskId}
                  setExpandedTaskId={setExpandedTaskId}
                  currentUserId={userProfile?.id || ''}
                  isAdmin={userProfile?.role === 'admin'}
                />
              ))
            )}
          </div>
        </div>

        {/* 2. 二쇱슂 ?댁뒋 諛?由ъ뒪??(Issue) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <span className="h-3 w-3 bg-rose-500 rounded-full"></span>
              二쇱슂 ?댁뒋 諛?由ъ뒪??({issueTasks.length})
            </h2>
            <button
              onClick={() => openAddModal('issue')}
              className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition"
              title="異붽?"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 min-h-[160px]">
            {issueTasks.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">?뱀씠 ?댁뒋 諛?由ъ뒪?ш? ?놁뒿?덈떎. ?몟</p>
            ) : (
              issueTasks.map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onEdit={openEditModal} 
                  onDelete={handleDeleteTask}
                  expandedTaskId={expandedTaskId}
                  setExpandedTaskId={setExpandedTaskId}
                  currentUserId={userProfile?.id || ''}
                  isAdmin={userProfile?.role === 'admin'}
                />
              ))
            )}
          </div>
        </div>

        {/* 3. 李⑥＜ 吏꾪뻾 怨꾪쉷 (Plan) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <span className="h-3 w-3 bg-indigo-500 rounded-full"></span>
              李⑥＜ ?덉젙 ?낅Т ({planTasks.length})
            </h2>
            <button
              onClick={() => openAddModal('plan')}
              className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition"
              title="異붽?"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 min-h-[160px]">
            {planTasks.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">?깅줉??李⑥＜ 怨꾪쉷???놁뒿?덈떎.</p>
            ) : (
              planTasks.map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onEdit={openEditModal} 
                  onDelete={handleDeleteTask}
                  expandedTaskId={expandedTaskId}
                  setExpandedTaskId={setExpandedTaskId}
                  currentUserId={userProfile?.id || ''}
                  isAdmin={userProfile?.role === 'admin'}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ?묒뾽 ?낅젰/?섏젙 紐⑤떖 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-zoomIn">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm">
                {editingTask ? '?묒뾽 ??ぉ ?섏젙' : '???묒뾽 ??ぉ 異붽?'} (
                {modalType === 'progress' ? '二쇱슂 ?ㅼ쟻' : modalType === 'issue' ? '?댁뒋?ы빆' : '李⑥＜ 怨꾪쉷'})
              </h3>
              <button onClick={closeModal} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">?묒뾽 ?쒕ぉ *</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="?? 怨좉컼???쒖뒪??湲곕뒫 ?곕룞 ?뚯뒪???꾨즺"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">?곸꽭 ?댁슜 (?좏깮)</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="?몃? 異붿쭊 ?댁슜 諛??꾪솴 ?뺣낫"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* ?대떦??DB ?좏깮 ?쒕∼?ㅼ슫 + 而ㅼ뒪? ?대떦???낅젰 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">?대떦??(?쒖뒪??DB)</label>
                  <select
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">吏곸젒 ?낅젰 ?먮뒗 誘몄???/option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name || m.email} ({m.team?.name || '?'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">?대떦???대쫫 (吏곸젒 ?섏젙/?낅젰)</label>
                  <input
                    type="text"
                    value={taskAssigneeName}
                    onChange={(e) => setTaskAssigneeName(e.target.value)}
                    placeholder="?? 源泥좎닔 怨쇱옣"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">吏꾪뻾瑜?({taskProgress}%)</label>
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
                  <label className="block font-bold text-slate-700 mb-1">?곹깭</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="pending">?湲?(Pending)</option>
                    <option value="in_progress">吏꾪뻾 以?(In Progress)</option>
                    <option value="completed">?꾨즺 (Completed)</option>
                    <option value="blocked">吏??由ъ뒪??(Blocked)</option>
                  </select>
                </div>
              </div>

              {!editingTask && (
                <div className="flex items-center gap-2 mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <input
                    type="checkbox"
                    id="isPendingTrack"
                    checked={isPendingTrack}
                    onChange={(e) => setIsPendingTrack(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded border-amber-300 focus:ring-amber-500"
                    disabled={!selectedTeamId}
                  />
                  <label htmlFor="isPendingTrack" className="text-xs font-bold text-amber-900 cursor-pointer">
                    ?댁뒋瑜?'Pending 異붿쟻' ??쒕낫?쒖뿉 ?먮룞?쇰줈 ?곕룞?섍린 (? ?좏깮 ?꾩슂)
                  </label>
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl transition"
                >
                  痍⑥냼
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-extrabold rounded-xl transition shadow-md shadow-sky-500/20"
                >
                  ??ν븯湲?
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      </>
      )}
    </div>
  );
};

// 媛쒕퀎 ?묒뾽 移대뱶 而댄룷?뚰듃
const TaskCard = ({
  task,
  onEdit,
  onDelete,
  expandedTaskId,
  setExpandedTaskId,
  currentUserId,
  isAdmin
}: {
  task: Task;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  expandedTaskId: string | null;
  setExpandedTaskId: (id: string | null) => void;
  currentUserId: string;
  isAdmin: boolean;
}) => {
  const isExpanded = expandedTaskId === task.id;

  return (
    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-200 hover:shadow-md transition space-y-2 group">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-extrabold text-slate-900 text-xs">{task.title}</h4>
            {task.is_carried_over && (
              <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-100 text-amber-800 rounded border border-amber-200">
                吏?쒖＜ ?닿?
              </span>
            )}
          </div>
          {task.description && <p className="text-[11px] text-slate-500 line-clamp-2">{task.description}</p>}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {(true) && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* 吏꾪뻾瑜?諛?*/}
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

      {/* ?섎떒 ?대떦???뺣낫 諛??≪뀡 */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100/80">
        <span className="flex items-center gap-1 font-semibold text-slate-600">
          <User className="h-3 w-3 text-slate-400" />
          {task.assignee_name || task.assignee?.full_name || '?대떦??誘몄???}
        </span>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
            className={`flex items-center gap-1 font-bold transition ${isExpanded ? 'text-sky-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            ?쇰뱶諛?
          </button>
          <span className="capitalize text-[10px] font-bold text-slate-500">{task.status}</span>
        </div>
      </div>

      {/* ?쇰뱶諛??꾩퐫?붿뼵 */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <TaskFeedback taskId={task.id} currentUserId={currentUserId} />
        </div>
      )}
    </div>
  );
};

export default TeamUpdate;
