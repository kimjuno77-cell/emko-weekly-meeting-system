// ?¤ëª…: ?€ë³?ì£¼ê°„ ?…ë°?´íŠ¸ ?‘ì„± ?˜ì´ì§€ ì»´í¬?ŒíŠ¸ (ì£¼ì°¨ ? íƒ, ì§€?œì£¼ ë¯¸ì™„ë£???ª© ?´ê?, ?´ë‹¹??DB ? íƒ, 2ì£¼ê°„ ë¹„êµ)

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

  // ì£¼ì°¨ ? íƒ ?íƒœ (ê¸°ë³¸ê°? ?´ë²ˆ ì£¼ì°¨ ?”ìš”??
  const defaultDates = getCurrentWeekDates();
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(defaultDates.weekStartDate);
  const [currentWeekEnd, setCurrentWeekEnd] = useState<string>(defaultDates.weekEndDate);

  // 2ì£¼ê°„ ë¹„êµ ë·?? ê?
  const [showComparison, setShowComparison] = useState(false);

  // ëª¨ë‹¬ ?íƒœ
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TaskType>('progress');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // ???…ë ¥ ?„ë“œ
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskProgress, setTaskProgress] = useState(0);
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskAssigneeName, setTaskAssigneeName] = useState('');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('pending');
  const [taskPriority, setTaskPriority] = useState<PriorityLevel>('medium');
  const [isPendingTrack, setIsPendingTrack] = useState(false);
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);

  // ?‘ì—…ë³??¼ë“œë°??„ì½”?”ì–¸ ?íƒœ
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

    // ?„ë¡œ?íŠ¸ ?„ë‹´?€ ?ë™ ë§¤í•‘ ë¡œì§
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
      
      // ì´ˆê¸° URL ë¡œë“œ ???ë™ ë§¤í•‘ ë¡œì§ ì¶”ê?
      if (safeInitialTeamId) {
        const team = teamsData.find(t => t.id === safeInitialTeamId);
        if (team) {
          const matchedProject = projectsData?.find(p => p.name === team.name);
          // URL??projectIdê°€ ëª…ì‹œ?˜ì–´ ?ˆì? ?Šì? ê²½ìš°?ë§Œ ?ë™ ë§¤í•‘
          if (matchedProject && !safeInitialProjectId) {
            setSelectedProjectId(matchedProject.id);
            
            // URL ?Œë¼ë¯¸í„°???…ë°?´íŠ¸
            const newParams = new URLSearchParams(searchParams);
            newParams.set('projectId', matchedProject.id);
            setSearchParams(newParams);
          } else if (!safeInitialProjectId) {
            // ?´ë¦„???¼ì¹˜?˜ëŠ” ?„ë¡œ?íŠ¸ê°€ ?†ì–´?? ?´ë‹¹ ?€??ìµœê·¼ ?‘ì„±???„ë¡œ?íŠ¸ê°€ ?ˆë‹¤ë©??ë™ ? íƒ (ê³µí†µ?…ë¬´?€ ?¸ì˜??
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
      console.error('ê¸°ì´ˆ ?°ì´??ë¡œë“œ ?¤íŒ¨:', error);
      toast.error('ê¸°ì´ˆ ?°ì´?°ë? ë¶ˆëŸ¬?¤ëŠ”???¤íŒ¨?ˆìŠµ?ˆë‹¤.');
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

      // ? íƒ??ì£¼ì°¨??ì£¼ê°„ ?…ë°?´íŠ¸ ê°€?¸ì˜¤ê¸?      let updateData = await getWeeklyUpdateByTeamAndWeek(tIdNullSafe, weekStart, pIdNullSafe);

      // ?´ë²ˆì£?ê³„ì‚°
      const calculatedDates = getCurrentWeekDates(parseISO(weekStart));
      setCurrentWeekEnd(calculatedDates.weekEndDate);

      // ë§Œì•½ ?´ë‹¹ ì£¼ì°¨ ë³´ê³ ?œê? ?†ìœ¼ë©??ë™ ?„ì‹œ ?ì„±
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

      // ì§€?œì£¼ ì£¼ê°„ ë³´ê³ ??& ì§€?œì£¼ ë¯¸ì™„ë£?UNCLOSED) ??ª© ê°€?¸ì˜¤ê¸?      const prevDates = getPrevWeekDates(weekStart);
      const prevUpdateData = await getWeeklyUpdateByTeamAndWeek(tIdNullSafe, prevDates.weekStartDate, pIdNullSafe);
      setPrevWeeklyUpdate(prevUpdateData);

      const unclosed = await getUnclosedTasksFromPrevWeek(tIdNullSafe, weekStart, pIdNullSafe);
      setUnclosedPrevTasks(unclosed);
    } catch (error) {
      console.error('?°ì´??ë¡œë“œ ?¤íŒ¨:', error);
      toast.error('ì£¼ê°„ ?…ë°?´íŠ¸ ?°ì´?°ë? ë¶ˆëŸ¬?¤ëŠ”???¤íŒ¨?ˆìŠµ?ˆë‹¤.');
    } finally {
      setLoading(false);
    }
  };

  // ì£¼ì°¨ ?´ë™ ?¬í¼ ?¨ìˆ˜
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

  // ì§€?œì£¼ ë¯¸ì™„ë£???ª© ?´ë²ˆì£?ì§„í–‰?¼ë¡œ ?ë™ ?´ê?(ë¶ˆëŸ¬?¤ê¸°)
  const handleCarryOverTasks = async () => {
    if (!weeklyUpdate || unclosedPrevTasks.length === 0) return;
    try {
      let importedCount = 0;
      for (const t of unclosedPrevTasks) {
        // ?´ë? ê°€?¸ì˜¨ ??ª©?¸ì? ì¤‘ë³µ ?•ì¸
        const isDuplicate = tasks.some((existing) => existing.title === t.title);
        if (!isDuplicate) {
          await createTask({
            weekly_update_id: weeklyUpdate.id,
            task_type: 'progress',
            title: `[?´ê?] ${t.title}`,
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
        toast.success(`ì§€?œì£¼ ë¯¸ì™„ë£???ª© ${importedCount}ê°œê? ?´ë²ˆì£??¤ì ?¼ë¡œ ?´ê??˜ì—ˆ?µë‹ˆ??`);
        fetchWeeklyData(currentWeekStart, selectedTeamId, selectedProjectId);
      } else {
        toast('ëª¨ë“  ë¯¸ì™„ë£???ª©???´ë? ?´ë²ˆì£?ëª©ë¡??ì¡´ì¬?©ë‹ˆ??', { icon: '?¹ï¸' });
      }
    } catch (error) {
      console.error('?´ê? ?¤íŒ¨:', error);
      toast.error('ì§€?œì£¼ ??ª© ?´ê????¤íŒ¨?ˆìŠµ?ˆë‹¤.');
    }
  };

  // ëª¨ë‹¬ ?´ê¸° (?±ë¡)
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

  // ëª¨ë‹¬ ?´ê¸° (?˜ì •)
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

  // ëª¨ë‹¬ ?«ê¸°
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  // ?‘ì—… ?€??(?±ë¡/?˜ì •)
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.error('?œëª©???…ë ¥?´ì£¼?¸ìš”.');
      return;
    }
    if (!weeklyUpdate) return;

    // ? íƒ???´ë‹¹?ì˜ ?´ë¦„ ?ìŠ¤???¤ì •
    const selectedMember = members.find((m) => m.id === taskAssigneeId);
    const finalAssigneeName = taskAssigneeName.trim() || selectedMember?.full_name || selectedMember?.email || '';

    try {
      if (editingTask) {
        // ?˜ì •
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
        toast.success('?‘ì—…???˜ì •?˜ì—ˆ?µë‹ˆ??');
      } else {
        // ?±ë¡
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
              notes: 'ì£¼ê°„ ?…ë¬´ ?Œì˜ë¡ì—???ë™ ?°ë™??
            });
            toast.success('???‘ì—…ê³??¨ê»˜ Pending ?„ì•ˆ???±ë¡?˜ì—ˆ?µë‹ˆ??');
          } catch(err) {
            console.error('Pending ?°ë™ ?¤íŒ¨:', err);
            toast.error('?‘ì—…?€ ?±ë¡?˜ì—ˆ?¼ë‚˜ Pending ?°ë™???¤íŒ¨?ˆìŠµ?ˆë‹¤.');
          }
        } else {
          toast.success('???‘ì—…??ì¶”ê??˜ì—ˆ?µë‹ˆ??');
        }
      }

      closeModal();
      fetchWeeklyData(currentWeekStart, selectedTeamId, selectedProjectId);
    } catch (error) {
      console.error('?‘ì—… ?€???¤íŒ¨:', error);
      toast.error('?‘ì—… ?€?¥ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.');
    }
  };

  // ?‘ì—… ?? œ
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('???‘ì—…???? œ?˜ì‹œê² ìŠµ?ˆê¹Œ?')) return;
    try {
      await deleteTask(taskId);
      toast.success('?‘ì—…???? œ?˜ì—ˆ?µë‹ˆ??');
      fetchWeeklyData(currentWeekStart, selectedTeamId, selectedProjectId);
    } catch (error) {
      console.error('?? œ ?¤íŒ¨:', error);
      toast.error('?‘ì—… ?? œ???¤íŒ¨?ˆìŠµ?ˆë‹¤.');
    }
  };

  // ?œì¶œ ?íƒœ ë³€ê²?  const handleSubmitReport = async (status: 'draft' | 'submitted') => {
    if (!weeklyUpdate) return;
    try {
      await changeWeeklyUpdateStatus(weeklyUpdate.id, status);
      setWeeklyUpdate({ ...weeklyUpdate, status });
      toast.success(status === 'submitted' ? 'ì£¼ê°„ ë³´ê³ ?œê? ?±ê³µ?ìœ¼ë¡??œì¶œ?˜ì—ˆ?µë‹ˆ??' : '?„ì‹œ ?€??ëª¨ë“œë¡?ë³€ê²½ë˜?ˆìŠµ?ˆë‹¤.');
    } catch (error) {
      toast.error('?íƒœ ë³€ê²??¤íŒ¨');
    }
  };

  const progressTasks = tasks.filter((t) => t.task_type === 'progress');
  const issueTasks = tasks.filter((t) => t.task_type === 'issue');
  const planTasks = tasks.filter((t) => t.task_type === 'plan');

  // ì§€?œì£¼ ì°¨ì£¼ê³„íš ??ª©
  const prevPlans = prevWeeklyUpdate?.tasks?.filter((t) => t.task_type === 'plan') || [];

  if (loading && (!team && !project)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  // ?¼ë°˜ ?€(?´ë¦„??'?€'?¼ë¡œ ?ë‚˜??ê²½ìš°) ?¬ë? ?ë‹¨
  const selectedTeamData = allTeams.find(t => t.id === selectedTeamId);
  const isCommonTeam = selectedTeamData ? selectedTeamData.name.endsWith('?€') : false;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ì£¼ê°„?…ë¬´ ?‘ì„± ê°€?´ë“œ */}
      <div className="bg-sky-50/50 border border-sky-100 p-4 rounded-2xl flex gap-3 items-start shadow-sm">
        <Info className="h-5 w-5 text-sky-600 mt-0.5 shrink-0" />
        <div className="text-sm text-sky-900 space-y-1 leading-relaxed">
          <p className="font-bold">?“ ì£¼ê°„?…ë¬´ ?‘ì„± ê°€?´ë“œ</p>
          <ul className="list-disc list-inside text-sky-800 space-y-0.5 opacity-90 pl-1">
            <li><strong>?„ë¡œ?íŠ¸ ?„ë‹´ ?€:</strong> ?€ ? íƒë§??˜ì‹œë©??„ë¡œ?íŠ¸ê°€ ?ë™ ë§¤í•‘?˜ì–´ ë³„ë„ë¡??„ë¡œ?íŠ¸ë¥?? íƒ?˜ì‹¤ ?„ìš”ê°€ ?†ìŠµ?ˆë‹¤.</li>
            <li><strong>ê³µí†µ?…ë¬´ ?€ (?? ê¸°ìˆ ?ˆì§ˆ?€ ??:</strong> ?€??? íƒ?˜ì‹  ?? ?°ì¸¡??<strong>[?„ë¡œ?íŠ¸ ì§ì ‘ ?…ë ¥]</strong> ?€?ì„œ ?´ë‹¹?˜ì‹œ???¹ì • ?„ë¡œ?íŠ¸ë¥?? íƒ?˜ì—¬ ?…ë¬´ë¥?ë¶„ë¦¬ ?‘ì„±??ì£¼ì„¸??</li>
          </ul>
        </div>
      </div>

      {/* ?ë‹¨ ?¤ë¹„ê²Œì´??& ì£¼ì°¨ ? íƒ ?¤ë” */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <Link
            to="/"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
            title="?€?œë³´?œë¡œ ?Œì•„ê°€ê¸?
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <select
              value={selectedTeamId}
              onChange={(e) => handleEntityChange('team', e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50"
            >
              <option value="">?€ ? íƒ ?†ìŒ</option>
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
                  <option value="">-- ?±ë¡???„ë¡œ?íŠ¸ ? íƒ ({allProjects.length}ê°? --</option>
                  {allProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </>
            ) : (
              selectedTeamData && (
                <div className="px-3 py-2 bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-inner">
                  <Sparkles className="w-4 h-4" /> ?„ë¡œ?íŠ¸ ?ë™ ë§¤í•‘??                </div>
              )
            )}
          </div>
        </div>

        {/* ì£¼ê°„ Navigator (?´ì „ì£?/ ?´ë²ˆì£?/ ?¤ìŒì£?? íƒ) */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/70">
          <button
            onClick={handlePrevWeek}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-xl shadow-xs transition flex items-center gap-1 text-xs font-bold"
            title="ì§€?œì£¼ ì£¼ì°¨ ë³´ê¸°"
          >
            <ChevronLeft className="h-4 w-4" /> ì§€?œì£¼
          </button>

          <button
            onClick={handleCurrentWeek}
            className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 ${
              currentWeekStart === defaultDates.weekStartDate
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" /> ?´ë²ˆì£?          </button>

          <div className="px-3 py-1 text-xs font-bold text-slate-700 flex items-center gap-1">
            <span>{currentWeekStart}</span>
            <span className="text-slate-400">~</span>
            <span>{currentWeekEnd}</span>
          </div>

          <button
            onClick={handleNextWeek}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-xl shadow-xs transition flex items-center gap-1 text-xs font-bold"
            title="?¤ìŒì£?ì£¼ì°¨ ë³´ê¸°"
          >
            ?¤ìŒì£?<ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {(!selectedTeamId && !selectedProjectId) ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 font-medium">?ë‹¨?ì„œ ?€ ?ëŠ” ?„ë¡œ?íŠ¸ë¥?? íƒ?´ì£¼?¸ìš”.</p>
        </div>
      ) : (
        <>
          {/* ì§€?œì£¼ ë¯¸ì™„ë£?UNCLOSED) ??ª© ?ë™ ë¶ˆëŸ¬?¤ê¸° ë°°ë„ˆ */}
          {unclosedPrevTasks.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-amber-100/50 border border-amber-200/80 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-pulse-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                ì§€?œì£¼ ë¯¸ì™„ë£?Unclosed) ?‘ì—… {unclosedPrevTasks.length}ê±?ê°ì???              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                ì§€?œì£¼ ?‘ì„±???…ë¬´ ì¤??„ì§ ?„ë£Œ?˜ì? ?Šì? ??ª©???ˆìŠµ?ˆë‹¤. ë²„íŠ¼???„ë¥´ë©??´ë²ˆì£?ì§„í–‰ ?…ë¬´ë¡??ë™ ?´ê??©ë‹ˆ??
              </p>
            </div>
          </div>

          <button
            onClick={handleCarryOverTasks}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold rounded-xl shadow-md shadow-amber-500/20 transition active:scale-95 flex items-center gap-2 whitespace-nowrap"
          >
            <Clock className="h-4 w-4" /> ?´ë²ˆì£??¤ì ?¼ë¡œ ?ë™ ë¶ˆëŸ¬?¤ê¸° ({unclosedPrevTasks.length}ê±?
          </button>
        </div>
      )}

      {/* ?ë‹¨ ?¡ì…˜ ë°?(2ì£¼ê°„ ë¹„êµ ë²„íŠ¼ ë°??œì¶œ ë²„íŠ¼) */}
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
          {showComparison ? '2ì£¼ê°„ ë¹„êµ ë·??«ê¸°' : '?“Š ì§€?œì£¼ ?†š ?´ë²ˆì£?2ì£¼ê°„ ë¹„êµ ë³´ê¸°'}
        </button>

        <div className="flex items-center gap-3">
          {weeklyUpdate?.status === 'submitted' ? (
            <span className="inline-flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-extrabold rounded-xl border border-emerald-200 gap-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-500" /> ?œì¶œ ?„ë£Œ??            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-extrabold rounded-xl border border-amber-200 gap-1.5">
              <FileEdit className="h-4 w-4 text-amber-500" /> ?‘ì„± ì¤?(Draft)
            </span>
          )}

          {weeklyUpdate?.status === 'submitted' ? (
            <button
              onClick={() => handleSubmitReport('draft')}
              className="px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            >
              ?˜ì • ëª¨ë“œë¡??„í™˜
            </button>
          ) : (
            <button
              onClick={() => handleSubmitReport('submitted')}
              className="px-4 py-2 text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5" /> ìµœì¢… ?œì¶œ?˜ê¸°
            </button>
          )}
        </div>
      </div>

      {/* ì§€?œì£¼ vs ?´ë²ˆì£?2ì£¼ê°„ ë¹„êµ ?¨ë„ (Toggle Panel) */}
      {showComparison && (
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-6 rounded-3xl text-white shadow-xl border border-white/10 space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-extrabold bg-indigo-500/30 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                2-WEEK COMPARISON MODE
              </span>
              <h2 className="text-lg font-extrabold mt-1">ì§€?œì£¼ ê³„íš(Plan) ?†š ?´ë²ˆì£??¤ì (Progress) ë¹„êµ</h2>
            </div>
            <button onClick={() => setShowComparison(false)} className="text-slate-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ì¢Œì¸¡: ì§€?œì£¼ ì°¨ì£¼ ?ˆì • (Plan) */}
            <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-3">
              <h3 className="text-xs font-extrabold text-sky-400 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> ì§€?œì£¼???˜ë¦½??ì°¨ì£¼ ê³„íš ({prevPlans.length}ê±?
              </h3>

              {prevPlans.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">ì§€?œì£¼ ì°¨ì£¼ ê³„íš ?°ì´?°ê? ?†ìŠµ?ˆë‹¤.</p>
              ) : (
                <div className="space-y-2">
                  {prevPlans.map((p) => (
                    <div key={p.id} className="p-3 bg-white/10 rounded-xl text-xs space-y-1">
                      <p className="font-bold text-slate-100">{p.title}</p>
                      {p.description && <p className="text-slate-400 text-[11px]">{p.description}</p>}
                      <div className="flex items-center justify-between text-[10px] text-slate-300 pt-1">
                        <span>?´ë‹¹: {p.assignee_name || p.assignee?.full_name || 'ë¯¸ì???}</span>
                        <span className="text-sky-300 font-semibold">?ˆì • ì§„í–‰ë¥? {p.progress_percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ?°ì¸¡: ?´ë²ˆì£??¤ì œ ?˜í–‰ ?¤ì  (Progress) */}
            <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-3">
              <h3 className="text-xs font-extrabold text-emerald-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> ?´ë²ˆì£??¤ì œ ì§„í–‰ ?¤ì  ({progressTasks.length}ê±?
              </h3>

              {progressTasks.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">?´ë²ˆì£??¤ì  ??ª©???„ì§ ?†ìŠµ?ˆë‹¤.</p>
              ) : (
                <div className="space-y-2">
                  {progressTasks.map((t) => (
                    <div key={t.id} className="p-3 bg-white/10 rounded-xl text-xs space-y-1.5 border border-white/5">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-100">{t.title}</p>
                        {t.is_carried_over && (
                          <span className="px-1.5 py-0.2 text-[9px] bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                            ?´ê???                          </span>
                        )}
                      </div>
                      {t.description && <p className="text-slate-400 text-[11px]">{t.description}</p>}

                      {/* ì§„í–‰ë¥?ë°?*/}
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
                        ?´ë‹¹?? {t.assignee_name || t.assignee?.full_name || 'ë¯¸ì???}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ?‘ì„± ê°€?´ë“œ (HRSG SCR ?¨í‚¤ì§€ ?¤ê³„?…ì²´ ?ˆì‹œ) */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
        <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-3">
          <Info className="h-4 w-4 text-sky-500" /> ì£¼ê°„ ?Œì˜ ë³´ê³ ???‘ì„± ê°€?´ë“œ
        </h3>
        <div className="text-xs text-slate-600 space-y-2">
          <p><strong>?‘ì„± ?ì¹™:</strong> ?…ë¬´???µì‹¬ ?„ì£¼ë¡?ëª…í™•?˜ê²Œ ?‘ì„±?˜ë©°, êµ¬ì²´?ì¸ ì§„í–‰ë¥?%)ê³??´ë‹¹?ë? ë°˜ë“œ??ëª…ì‹œ??ì£¼ì„¸??</p>
          <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-3 mt-3">
            <p className="font-bold text-slate-700">?’¡ [?ˆì‹œ] HRSG SCR ?¨í‚¤ì§€ ?¤ê³„?…ì²´ (?„ë¡œ?íŠ¸ TF?€)</p>
            <ul className="list-disc list-inside space-y-2 pl-1 text-slate-600">
              <li>
                <span className="font-semibold text-sky-600">[ê¸ˆì£¼ ì£¼ìš” ?¤ì ]</span> 
                {' '}SCR Reactor ê¸°ë³¸ ?¤ê³„(Basic Engineering) ?„ë©´ ì´ˆì•ˆ ?‘ì„± (ì§„í–‰ë¥?80%) / ì´‰ë§¤(Catalyst) ê³µê¸‰?…ì²´ 1ì°?ë¯¸íŒ… ?„ë£Œ
              </li>
              <li>
                <span className="font-semibold text-rose-500">[ì£¼ìš” ?´ìŠˆ/?¥í•´]</span> 
                {' '}ë°°ì••(Back pressure) ì¦ê?ë¡??¸í•œ ? ë™ ?´ì„(CFD) ?¬ê????„ìš”. (?¹ì¸ ?¼ì • 1ì£?ì§€??ë¦¬ìŠ¤??
              </li>
              <li>
                <span className="font-semibold text-emerald-600">[ì°¨ì£¼ ?ˆì • ê³„íš]</span> 
                {' '}? ë™ ?´ì„ ìµœì ??ëª¨ë¸ ?„ì¶œ ë°?ë°œì£¼ì²??¹ì¸(Approval)???„ë©´ ìµœì¢… ?œì¶œ
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 3ê°?ì£¼ê°„ ?‘ì—… ?ì—­ (1. ê¸ˆì£¼ ì£¼ìš” ?¤ì  / 2. ?´ìŠˆ ë°?ì§€?ì‚¬??/ 3. ì°¨ì£¼ ?ˆì • ê³„íš) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. ê¸ˆì£¼ ì£¼ìš” ì§„í–‰?¬í•­ (Progress) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <span className="h-3 w-3 bg-sky-500 rounded-full"></span>
              ê¸ˆì£¼ ì£¼ìš” ì§„í–‰?¬í•­ ({progressTasks.length})
            </h2>
            <button
              onClick={() => openAddModal('progress')}
              className="p-1.5 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-xl transition"
              title="ì¶”ê?"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 min-h-[160px]">
            {progressTasks.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">?±ë¡??ì£¼ìš” ì§„í–‰?¬í•­???†ìŠµ?ˆë‹¤.</p>
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
                  currentUserRole={userProfile?.role || 'member'}
                />
              ))
            )}
          </div>
        </div>

        {/* 2. ì£¼ìš” ?´ìŠˆ ë°?ë¦¬ìŠ¤??(Issue) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <span className="h-3 w-3 bg-rose-500 rounded-full"></span>
              ì£¼ìš” ?´ìŠˆ ë°?ë¦¬ìŠ¤??({issueTasks.length})
            </h2>
            <button
              onClick={() => openAddModal('issue')}
              className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition"
              title="ì¶”ê?"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 min-h-[160px]">
            {issueTasks.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">?¹ì´ ?´ìŠˆ ë°?ë¦¬ìŠ¤?¬ê? ?†ìŠµ?ˆë‹¤. ?‘</p>
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
                  currentUserRole={userProfile?.role || 'member'}
                />
              ))
            )}
          </div>
        </div>

        {/* 3. ì°¨ì£¼ ì§„í–‰ ê³„íš (Plan) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <span className="h-3 w-3 bg-indigo-500 rounded-full"></span>
              ì°¨ì£¼ ?ˆì • ?…ë¬´ ({planTasks.length})
            </h2>
            <button
              onClick={() => openAddModal('plan')}
              className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition"
              title="ì¶”ê?"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 min-h-[160px]">
            {planTasks.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">?±ë¡??ì°¨ì£¼ ê³„íš???†ìŠµ?ˆë‹¤.</p>
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
                  currentUserRole={userProfile?.role || 'member'}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ?‘ì—… ?…ë ¥/?˜ì • ëª¨ë‹¬ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-zoomIn">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm">
                {editingTask ? '?‘ì—… ??ª© ?˜ì •' : '???‘ì—… ??ª© ì¶”ê?'} (
                {modalType === 'progress' ? 'ì£¼ìš” ?¤ì ' : modalType === 'issue' ? '?´ìŠˆ?¬í•­' : 'ì°¨ì£¼ ê³„íš'})
              </h3>
              <button onClick={closeModal} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">?‘ì—… ?œëª© *</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="?? ê³ ê°???œìŠ¤??ê¸°ëŠ¥ ?°ë™ ?ŒìŠ¤???„ë£Œ"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">?ì„¸ ?´ìš© (? íƒ)</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="?¸ë? ì¶”ì§„ ?´ìš© ë°??„í™© ?•ë³´"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* ?´ë‹¹??DB ? íƒ ?œë¡­?¤ìš´ + ì»¤ìŠ¤?€ ?´ë‹¹???…ë ¥ */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">?´ë‹¹??(?œìŠ¤??DB)</label>
                  <select
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">ì§ì ‘ ?…ë ¥ ?ëŠ” ë¯¸ì???/option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name || m.email} ({m.team?.name || '?€'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">?´ë‹¹???´ë¦„ (ì§ì ‘ ?˜ì •/?…ë ¥)</label>
                  <input
                    type="text"
                    value={taskAssigneeName}
                    onChange={(e) => setTaskAssigneeName(e.target.value)}
                    placeholder="?? ê¹€ì² ìˆ˜ ê³¼ì¥"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ì§„í–‰ë¥?({taskProgress}%)</label>
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
                  <label className="block font-bold text-slate-700 mb-1">?íƒœ</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="pending">?€ê¸?(Pending)</option>
                    <option value="in_progress">ì§„í–‰ ì¤?(In Progress)</option>
                    <option value="completed">?„ë£Œ (Completed)</option>
                    <option value="blocked">ì§€??ë¦¬ìŠ¤??(Blocked)</option>
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
                    ?´ìŠˆë¥?'Pending ì¶”ì ' ?€?œë³´?œì— ?ë™?¼ë¡œ ?°ë™?˜ê¸° (?€ ? íƒ ?„ìš”)
                  </label>
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl transition"
                >
                  ì·¨ì†Œ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-extrabold rounded-xl transition shadow-md shadow-sky-500/20"
                >
                  ?€?¥í•˜ê¸?                </button>
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

// ê°œë³„ ?‘ì—… ì¹´ë“œ ì»´í¬?ŒíŠ¸
const TaskCard = ({
  task,
  onEdit,
  onDelete,
  expandedTaskId,
  setExpandedTaskId,
  currentUserId,
  currentUserRole
}: {
  task: Task;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  expandedTaskId: string | null;
  setExpandedTaskId: (id: string | null) => void;
  currentUserId: string;
  currentUserRole: string;
}) => {
  const isExpanded = expandedTaskId === task.id;
  const canEditOrDelete = currentUserRole === 'admin' || task.created_by === currentUserId;

  return (
    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-200 hover:shadow-md transition space-y-2 group">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-extrabold text-slate-900 text-xs">{task.title}</h4>
            {task.is_carried_over && (
              <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-100 text-amber-800 rounded border border-amber-200">
                ì§€?œì£¼ ?´ê?
              </span>
            )}
          </div>
          {task.description && <p className="text-[11px] text-slate-500 line-clamp-2">{task.description}</p>}
        </div>

        {canEditOrDelete && (
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
        )}
      </div>

      {/* ì§„í–‰ë¥?ë°?*/}
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

      {/* ?˜ë‹¨ ?´ë‹¹???•ë³´ ë°??¡ì…˜ */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100/80">
        <span className="flex items-center gap-1 font-semibold text-slate-600">
          <User className="h-3 w-3 text-slate-400" />
          {task.assignee_name || task.assignee?.full_name || '?´ë‹¹??ë¯¸ì???}
        </span>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
            className={`flex items-center gap-1 font-bold transition ${isExpanded ? 'text-sky-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            ?¼ë“œë°?          </button>
          <span className="capitalize text-[10px] font-bold text-slate-500">{task.status}</span>
        </div>
      </div>

      {/* ?¼ë“œë°??„ì½”?”ì–¸ */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <TaskFeedback taskId={task.id} currentUserId={currentUserId} />
        </div>
      )}
    </div>
  );
};

export default TeamUpdate;
