import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  Users,
  AlertCircle,
  Clock,
  TrendingUp,
  ArrowRight,
  ClipboardList,
  Activity
} from 'lucide-react';
import { getAllTeams } from '@/services/teamService';
import { getPendingStats, getHighPriorityPendingItems } from '@/services/pendingService';
import { getCurrentWeekDates, getWeeklyUpdatesByWeek } from '@/services/weeklyUpdateService';
import { useAuthStore } from '@/stores/authStore';
import { Team, PendingItem, WeeklyUpdate } from '@/types';
import toast from 'react-hot-toast';
import { calculateWorkloadRanking, WorkloadRanking } from '@/services/workloadService';

const Dashboard = () => {
  const { userProfile } = useAuthStore();
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [currentUpdates, setCurrentUpdates] = useState<WeeklyUpdate[]>([]);
  const [pendingStats, setPendingStats] = useState({
    total: 0,
    in_progress: 0,
    high_priority: 0,
  });
  const [highPriorityItems, setHighPriorityItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobilizations, setMobilizations] = useState<any[]>([]);
  const [workloadRankings, setWorkloadRankings] = useState<WorkloadRanking[]>([]);
  const [activeTab, setActiveTab] = useState<'mplan' | 'phase' | 'manhour'>('mplan');
  const [manHourView, setManHourView] = useState<'matrix' | 'monthly'>('matrix');
  
  const { weekStartDate, weekEndDate } = getCurrentWeekDates();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [teamsData, statsData, highPriorityData, projectsRes, mobRes, updatesData, usersRes, offlineRes] = await Promise.all([
        getAllTeams(),
        getPendingStats(),
        getHighPriorityPendingItems(),
        supabase.from('projects').select('*, phases:project_phases(*)').order('name', { ascending: true }),
        supabase.from('project_mobilizations').select('*, user:user_profiles!project_mobilizations_user_id_fkey(full_name), offline:offline_personnel!project_mobilizations_offline_personnel_id_fkey(full_name), project:projects(name)').order('start_date', { ascending: true }),
        getWeeklyUpdatesByWeek(weekStartDate),
        supabase.from('user_profiles').select('*'),
        supabase.from('offline_personnel').select('*')
      ]);
      
      setTeams(teamsData);
      setPendingStats(statsData);
      setHighPriorityItems(highPriorityData);
      setProjects(projectsRes.data || []);
      
      const mobs = mobRes.data || [];
      setMobilizations(mobs);
      setCurrentUpdates(updatesData);

      const users = usersRes.data || [];
      const offline = offlineRes.data || [];
      const rankings = calculateWorkloadRanking(mobs, users as any, offline);
      setWorkloadRankings(rankings.slice(0, 5));

    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
      toast.error('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const submittedUpdates = currentUpdates.filter(u => u.status === 'submitted' || u.status === 'reviewed');
  const submittedCount = submittedUpdates.length;

  // Monthly Aggregation for M-Plan
  const { monthHeaders, monthlyData } = useMemo(() => {
    const today = new Date();
    const headers: { label: string, year: number, month: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      headers.push({
        label: `${d.getMonth() + 1}월`,
        year: d.getFullYear(),
        month: d.getMonth()
      });
    }

    // projectId -> array of Set<string> corresponding to headers to keep track of distinct personnel
    const dataMap = new Map<string, Set<string>[]>(); 

    projects.forEach(p => {
      if (p.status !== 'active') return;
      dataMap.set(p.id, [new Set(), new Set(), new Set(), new Set(), new Set(), new Set()]);
    });

    mobilizations.forEach(mob => {
      const pId = mob.project_id;
      if (!dataMap.has(pId)) return;
      
      // 고유 인원 식별자
      const personId = mob.user_id || mob.offline_personnel_id;
      if (!personId) return;

      const s = new Date(mob.start_date);
      const e = new Date(mob.end_date);
      
      headers.forEach((h, index) => {
        // check if mob overlaps with the month 'h'
        const startOfMonth = new Date(h.year, h.month, 1);
        const endOfMonth = new Date(h.year, h.month + 1, 0);
        
        if (s <= endOfMonth && e >= startOfMonth) {
          const sets = dataMap.get(pId)!;
          sets[index].add(personId);
        }
      });
    });

    const rows = projects.filter(p => p.status === 'active').map(p => {
      const sets = dataMap.get(p.id)!;
      return {
        projectName: p.name,
        counts: sets.map(s => s.size)
      };
    });

    // sort by total mobilizations in 6 months
    rows.sort((a, b) => b.counts.reduce((sum, c) => sum + c, 0) - a.counts.reduce((sum, c) => sum + c, 0));

    return { monthHeaders: headers, monthlyData: rows };
  }, [projects, mobilizations]);

  // Monthly Aggregation for Phase Progress
  const phaseProgressData = useMemo(() => {
    if (projects.length === 0) return [];
    
    const rows = projects.filter(p => p.status === 'active').map(p => {
      const phasesList = monthHeaders.map(h => {
        const startOfMonth = new Date(h.year, h.month, 1);
        const endOfMonth = new Date(h.year, h.month + 1, 0);
        
        // Find phases active in this month
        const activePhases = (p.phases || []).filter((ph: any) => {
          const sDateStr = ph.actual_start_date || ph.planned_start_date;
          const eDateStr = ph.actual_end_date || ph.planned_end_date;
          if (!sDateStr || !eDateStr) return false;
          
          const s = new Date(sDateStr);
          const e = new Date(eDateStr);
          return s <= endOfMonth && e >= startOfMonth;
        });
        
        return activePhases.map((ph: any) => ph.phase_name).join(', ');
      });
      
      return {
        projectName: p.name,
        phasesList
      };
    });
    
    return rows;
  }, [projects, monthHeaders]);

  // Man/Hour Aggregation
  const manHourData = useMemo(() => {
    if (mobilizations.length === 0 || projects.length === 0) return { columns: [], rows: [], projectTotals: new Map<string, number>(), grandTotal: 0 };

    // Get active projects for columns
    const activeProjects = projects.filter(p => p.status === 'active');
    
    // personId -> { name: string, isOffline: boolean, projectHours: Map<string, number>, total: number }
    const personMap = new Map<string, { name: string, isOffline: boolean, projectHours: Map<string, number>, total: number }>();

    // Init personMap from mobilizations to get names
    mobilizations.forEach(mob => {
      const pId = mob.user_id || mob.offline_personnel_id;
      if (!pId) return;
      if (!personMap.has(pId)) {
        personMap.set(pId, {
          name: mob.user ? mob.user.full_name : (mob.offline ? mob.offline.full_name : '알 수 없음'),
          isOffline: !mob.user_id,
          projectHours: new Map(),
          total: 0
        });
      }
    });

    // Find min and max date
    let minTime = Infinity;
    let maxTime = -Infinity;
    mobilizations.forEach(mob => {
      const s = new Date(mob.start_date).getTime();
      const e = new Date(mob.end_date).getTime();
      if (s < minTime) minTime = s;
      if (e > maxTime) maxTime = e;
    });

    if (minTime === Infinity) return { columns: activeProjects, rows: [], projectTotals: new Map<string, number>(), grandTotal: 0 };

    const startDay = new Date(minTime);
    const endDay = new Date(maxTime);
    
    // Normalize to midnight
    startDay.setHours(0,0,0,0);
    endDay.setHours(0,0,0,0);

    for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekend

      const time = d.getTime();

      // Find all active mobs for this day
      // group by personId -> Set of projectIds
      const dayPersonProjects = new Map<string, Set<string>>();

      mobilizations.forEach(mob => {
        const pId = mob.user_id || mob.offline_personnel_id;
        if (!pId) return;

        const s = new Date(mob.start_date).setHours(0,0,0,0);
        const e = new Date(mob.end_date).setHours(0,0,0,0);

        if (time >= s && time <= e) {
          if (!dayPersonProjects.has(pId)) {
            dayPersonProjects.set(pId, new Set());
          }
          dayPersonProjects.get(pId)!.add(mob.project_id);
        }
      });

      // Distribute 8 hours
      dayPersonProjects.forEach((projSet, pId) => {
        const n = projSet.size;
        if (n === 0) return;
        const hoursPerProj = 8 / n;
        
        const personInfo = personMap.get(pId)!;
        projSet.forEach(projId => {
          const current = personInfo.projectHours.get(projId) || 0;
          personInfo.projectHours.set(projId, current + hoursPerProj);
          personInfo.total += hoursPerProj;
        });
      });
    }

    // Convert map to array and sort by total hours descending
    const rows = Array.from(personMap.values())
      .filter(p => p.total > 0) // only include if they have hours
      .sort((a, b) => b.total - a.total);

    // Calculate project totals
    const projectTotals = new Map<string, number>();
    activeProjects.forEach(p => projectTotals.set(p.id, 0));
    let grandTotal = 0;
    
    rows.forEach(r => {
      activeProjects.forEach(p => {
        const val = r.projectHours.get(p.id) || 0;
        projectTotals.set(p.id, projectTotals.get(p.id)! + val);
      });
      grandTotal += r.total;
    });

    return { columns: activeProjects, rows, projectTotals, grandTotal };
  }, [mobilizations, projects]);

  // Man/Hour Monthly Trend
  const manHourMonthlyData = useMemo(() => {
    if (mobilizations.length === 0 || projects.length === 0) return { personRows: [], projectRows: [] };

    const activeProjects = projects.filter(p => p.status === 'active');
    const projectNames = new Map(activeProjects.map(p => [p.id, p.name]));

    const personMonthly = Array.from({ length: 6 }, () => new Map<string, number>());
    const projectMonthly = Array.from({ length: 6 }, () => new Map<string, number>());
    const personDetails = new Map<string, { name: string, isOffline: boolean }>();

    mobilizations.forEach(mob => {
      const pId = mob.user_id || mob.offline_personnel_id;
      if (!pId) return;
      if (!personDetails.has(pId)) {
        personDetails.set(pId, {
          name: mob.user ? mob.user.full_name : (mob.offline ? mob.offline.full_name : '알 수 없음'),
          isOffline: !mob.user_id,
        });
      }
    });

    monthHeaders.forEach((mh, monthIdx) => {
      const startOfMonth = new Date(mh.year, mh.month - 1, 1);
      const endOfMonth = new Date(mh.year, mh.month, 0);
      
      const startDay = new Date(startOfMonth);
      const endDay = new Date(endOfMonth);
      
      for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        const time = d.getTime();
        const dayPersonProjects = new Map<string, Set<string>>();

        mobilizations.forEach(mob => {
          const pId = mob.user_id || mob.offline_personnel_id;
          if (!pId) return;

          const s = new Date(mob.start_date).setHours(0,0,0,0);
          const e = new Date(mob.end_date).setHours(0,0,0,0);

          if (time >= s && time <= e) {
            if (!dayPersonProjects.has(pId)) {
              dayPersonProjects.set(pId, new Set());
            }
            dayPersonProjects.get(pId)!.add(mob.project_id);
          }
        });

        dayPersonProjects.forEach((projSet, pId) => {
          const n = projSet.size;
          if (n === 0) return;
          const hoursPerProj = 8 / n;

          // Add 8 hours to person's monthly total
          const currentPersonTotal = personMonthly[monthIdx].get(pId) || 0;
          personMonthly[monthIdx].set(pId, currentPersonTotal + 8);

          // Distribute 8 hours among projects for this month
          projSet.forEach(projId => {
            const currentProjTotal = projectMonthly[monthIdx].get(projId) || 0;
            projectMonthly[monthIdx].set(projId, currentProjTotal + hoursPerProj);
          });
        });
      }
    });

    const personRows = Array.from(personDetails.entries()).map(([pId, details]) => {
      const months = personMonthly.map(monthMap => monthMap.get(pId) || 0);
      const total = months.reduce((a, b) => a + b, 0);
      return { ...details, months, total };
    }).filter(row => row.total > 0).sort((a, b) => b.total - a.total);

    const projectRows = Array.from(projectNames.entries()).map(([projId, name]) => {
      const months = projectMonthly.map(monthMap => monthMap.get(projId) || 0);
      const total = months.reduce((a, b) => a + b, 0);
      return { name, months, total };
    }).filter(row => row.total > 0).sort((a, b) => b.total - a.total);

    return { personRows, projectRows };
  }, [mobilizations, projects, monthHeaders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-sky-500"></div>
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-sky-500">로딩</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-slate-950 text-slate-200 overflow-hidden flex flex-col font-sans -m-4 sm:-m-6 lg:-m-8 p-4">
      
      {/* HEADER ROW */}
      <div className="flex justify-between items-center mb-4 shrink-0 px-2">
        <div className="flex items-center space-x-3">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-xl font-bold text-white tracking-tight">주간 현황판 (Status Board)</h1>
          <span className="text-xs text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full bg-slate-800/50">
            {weekStartDate} ~ {weekEndDate}
          </span>
        </div>
        {userProfile?.team_id && (
          <Link
            to="/update"
            className="flex items-center px-3 py-1.5 bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-bold rounded-md transition shadow-lg shadow-indigo-900/50"
          >
            업데이트 작성 <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        )}
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-4 gap-4 mb-4 shrink-0">
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 flex justify-between items-center shadow-md">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">전체 팀 제출율</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-white">{submittedCount}</span>
              <span className="text-xs text-slate-500">/ {teams.length}</span>
            </div>
          </div>
          <Users className="h-8 w-8 text-sky-500/50" />
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 flex justify-between items-center shadow-md">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">미해결 Pending</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-amber-500">{pendingStats.total}</span>
            </div>
          </div>
          <ClipboardList className="h-8 w-8 text-amber-500/50" />
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 flex justify-between items-center shadow-md">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">진행 중 (In Progress)</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-emerald-500">{pendingStats.in_progress}</span>
            </div>
          </div>
          <TrendingUp className="h-8 w-8 text-emerald-500/50" />
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 flex justify-between items-center shadow-md">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">긴급 조치 (High)</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-rose-500">{pendingStats.high_priority}</span>
            </div>
          </div>
          <AlertCircle className="h-8 w-8 text-rose-500/50" />
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        
        {/* LEFT: Teams & Pending */}
        <div className="col-span-3 flex flex-col gap-4 min-h-0">
          <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-lg p-4 flex flex-col min-h-0">
            <h2 className="text-xs font-bold text-slate-300 mb-3 flex items-center"><AlertCircle className="w-3.5 h-3.5 mr-1.5 text-rose-400"/>주간 미제출 조직</h2>
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
              {teams.filter(t => !currentUpdates.some(cu => cu.team_id === t.id && cu.status !== 'draft')).map(team => (
                <div key={team.id} className="text-xs bg-rose-950/30 border border-rose-900/50 text-rose-300 px-3 py-2 rounded-md flex justify-between items-center">
                  <span>{team.name}</span>
                  <span className="text-[10px] opacity-75">미제출</span>
                </div>
              ))}
              {teams.filter(t => !currentUpdates.some(cu => cu.team_id === t.id && cu.status !== 'draft')).length === 0 && (
                <div className="text-xs text-emerald-400 text-center py-4 bg-emerald-950/20 rounded border border-emerald-900/30">
                  전체 조직 제출 완료
                </div>
              )}
            </div>
          </div>

          <div className="flex-[1.5] bg-slate-900/50 border border-slate-800 rounded-lg p-4 flex flex-col min-h-0">
            <h2 className="text-xs font-bold text-slate-300 mb-3 flex items-center"><Clock className="w-3.5 h-3.5 mr-1.5 text-amber-400"/>긴급 Pending 이슈 (Top 5)</h2>
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
              {highPriorityItems.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-4">긴급 이슈가 없습니다.</div>
              ) : (
                highPriorityItems.slice(0, 5).map(item => (
                  <div key={item.id} className="bg-slate-800/50 border border-slate-700/50 p-2.5 rounded-md flex flex-col gap-1.5 hover:bg-slate-800 transition cursor-pointer">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-mono border border-rose-500/30">{item.item_id}</span>
                      <span className="text-[10px] text-slate-400">{item.team?.name}</span>
                    </div>
                    <span className="text-xs font-medium text-slate-200 line-clamp-2 leading-tight">{item.title}</span>
                    <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                      <span>{item.assignee?.full_name || '미정'}</span>
                      <span className="text-amber-500">{item.target_date || '기한없음'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* CENTER: Matrix Area */}
        <div className="col-span-6 bg-slate-900/50 border border-slate-800 rounded-lg p-4 flex flex-col min-h-0 shadow-lg">
          <div className="flex justify-between items-end mb-4 shrink-0 border-b border-slate-800 pb-2">
            <div className="flex space-x-6">
              <button 
                onClick={() => setActiveTab('mplan')}
                className={`text-xs font-bold flex items-center pb-2 border-b-2 transition-colors relative top-[9px] ${activeTab === 'mplan' ? 'text-sky-400 border-sky-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
              >
                <Activity className="w-3.5 h-3.5 mr-1.5" /> 인력 투입 (M-PLAN)
              </button>
              <button 
                onClick={() => setActiveTab('phase')}
                className={`text-xs font-bold flex items-center pb-2 border-b-2 transition-colors relative top-[9px] ${activeTab === 'phase' ? 'text-indigo-400 border-indigo-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
              >
                <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> 공정 진행 (PHASE)
              </button>
              <button 
                onClick={() => setActiveTab('manhour')}
                className={`text-xs font-bold flex items-center pb-2 border-b-2 transition-colors relative top-[9px] ${activeTab === 'manhour' ? 'text-emerald-400 border-emerald-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
              >
                <Clock className="w-3.5 h-3.5 mr-1.5" /> 총 누적 시간 (M/H)
              </button>
            </div>
            {activeTab === 'mplan' && <Link to="/mobilization" className="text-[10px] text-sky-400 hover:text-sky-300 underline">상세 간트차트 보기</Link>}
            {activeTab === 'phase' && <Link to="/projects" className="text-[10px] text-indigo-400 hover:text-indigo-300 underline">프로젝트 관리 가기</Link>}
            {activeTab === 'manhour' && (
              <div className="flex items-center space-x-2 mr-2">
                <button
                  onClick={() => setManHourView('matrix')}
                  className={`text-[10px] px-2 py-1 rounded-sm font-semibold transition-colors ${manHourView === 'matrix' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  개인-프로젝트 매트릭스
                </button>
                <button
                  onClick={() => setManHourView('monthly')}
                  className={`text-[10px] px-2 py-1 rounded-sm font-semibold transition-colors ${manHourView === 'monthly' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  월간 추이 뷰
                </button>
                <div className="text-[9px] text-slate-500 ml-2">* 평일(월~금) 기준 계산</div>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-auto rounded-md border border-slate-800 custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-950 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="py-2.5 px-3 font-semibold text-slate-400 border-b border-slate-800 w-1/4">
                    {activeTab === 'manhour' ? (manHourView === 'monthly' ? '인원명' : '인원명') : '프로젝트명'}
                  </th>
                  {activeTab !== 'manhour' || (activeTab === 'manhour' && manHourView === 'monthly') ? (
                    monthHeaders.map(h => (
                      <th key={h.label} className="py-2.5 px-2 text-center font-semibold text-slate-400 border-b border-slate-800 border-l border-slate-800/50">
                        {h.label}
                      </th>
                    ))
                  ) : (
                    <>
                      {manHourData.columns.map(p => (
                        <th key={p.id} className="py-2.5 px-2 text-center font-semibold text-slate-400 border-b border-slate-800 border-l border-slate-800/50 truncate max-w-[80px]" title={p.name}>
                          {p.name}
                        </th>
                      ))}
                    </>
                  )}
                  {activeTab === 'manhour' && (
                    <th className="py-2.5 px-3 text-center font-bold text-emerald-500 border-b border-slate-800 border-l border-slate-800/50 w-[80px]">
                      Total
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {activeTab === 'mplan' ? (
                  monthlyData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">진행 중인 프로젝트가 없습니다.</td>
                    </tr>
                  ) : (
                    monthlyData.map(row => (
                      <tr key={row.projectName} className="hover:bg-slate-800/30 transition">
                        <td className="py-2 px-3 font-medium text-slate-300">{row.projectName}</td>
                        {row.counts.map((c, i) => (
                          <td key={i} className="py-2 px-2 text-center border-l border-slate-800/50">
                            {c > 0 ? (
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-sm font-bold ${
                                c >= 10 ? 'bg-rose-500/20 text-rose-400' :
                                c >= 5 ? 'bg-amber-500/20 text-amber-400' :
                                'bg-sky-500/20 text-sky-400'
                              }`}>
                                {c}
                              </span>
                            ) : (
                              <span className="text-slate-700">-</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )
                ) : activeTab === 'phase' ? (
                  phaseProgressData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">진행 중인 프로젝트가 없습니다.</td>
                    </tr>
                  ) : (
                    phaseProgressData.map(row => (
                      <tr key={row.projectName} className="hover:bg-slate-800/30 transition">
                        <td className="py-2 px-3 font-medium text-slate-300">{row.projectName}</td>
                        {row.phasesList.map((phText, i) => (
                          <td key={i} className="py-2 px-1 text-center border-l border-slate-800/50">
                            {phText ? (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {phText.split(', ').map((pt: string, idx: number) => (
                                  <span key={idx} className="text-[9px] font-medium bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 rounded-sm whitespace-nowrap border border-indigo-500/20">
                                    {pt}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-700">-</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )
                ) : activeTab === 'manhour' && manHourView === 'matrix' ? (
                  manHourData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={manHourData.columns.length + 2} className="py-8 text-center text-slate-500">투입 내역이 없습니다.</td>
                    </tr>
                  ) : (
                    manHourData.rows.map(row => (
                      <tr key={row.name} className="hover:bg-slate-800/30 transition">
                        <td className="py-2 px-3 font-medium text-slate-300 flex items-center gap-1.5">
                          {row.name}
                          {row.isOffline && <span className="text-[8px] bg-amber-500/20 text-amber-400 px-1 rounded border border-amber-500/30">미가입</span>}
                        </td>
                        {manHourData.columns.map(p => {
                          const val = row.projectHours.get(p.id);
                          return (
                            <td key={p.id} className="py-2 px-2 text-center border-l border-slate-800/50 font-mono text-[10px]">
                              {val ? (
                                <span className={val > 100 ? "text-emerald-400 font-bold" : "text-slate-300"}>
                                  {Number.isInteger(val) ? val : val.toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-slate-700">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-center border-l border-slate-800/50 font-mono font-bold text-emerald-400">
                          {Number.isInteger(row.total) ? row.total : row.total.toFixed(1)}
                        </td>
                      </tr>
                    ))
                  )
                ) : activeTab === 'manhour' && manHourView === 'monthly' ? (
                  manHourMonthlyData.personRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">투입 내역이 없습니다.</td>
                    </tr>
                  ) : (
                    <>
                      {manHourMonthlyData.personRows.map(row => (
                        <tr key={row.name} className="hover:bg-slate-800/30 transition">
                          <td className="py-2 px-3 font-medium text-slate-300 flex items-center gap-1.5">
                            {row.name}
                            {row.isOffline && <span className="text-[8px] bg-amber-500/20 text-amber-400 px-1 rounded border border-amber-500/30">미가입</span>}
                          </td>
                          {row.months.map((val, i) => (
                            <td key={i} className="py-2 px-2 text-center border-l border-slate-800/50 font-mono text-[10px]">
                              {val > 0 ? (
                                <span className={val >= 160 ? "text-emerald-400 font-bold" : "text-slate-300"}>
                                  {Number.isInteger(val) ? val : val.toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-slate-700">-</span>
                              )}
                            </td>
                          ))}
                          <td className="py-2 px-3 text-center border-l border-slate-800/50 font-mono font-bold text-emerald-400">
                            {Number.isInteger(row.total) ? row.total : row.total.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                      
                      {/* Project Header Row for Monthly View */}
                      <tr>
                        <td colSpan={8} className="bg-slate-950 py-2.5 px-3 font-semibold text-slate-400 border-y border-slate-800">
                          프로젝트별 M/H 합계 추이
                        </td>
                      </tr>
                      {manHourMonthlyData.projectRows.map(row => (
                        <tr key={row.name} className="hover:bg-slate-800/30 transition">
                          <td className="py-2 px-3 font-medium text-slate-300">
                            {row.name}
                          </td>
                          {row.months.map((val, i) => (
                            <td key={i} className="py-2 px-2 text-center border-l border-slate-800/50 font-mono text-[10px]">
                              {val > 0 ? (
                                <span className="text-slate-300">
                                  {Number.isInteger(val) ? val : val.toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-slate-700">-</span>
                              )}
                            </td>
                          ))}
                          <td className="py-2 px-3 text-center border-l border-slate-800/50 font-mono font-bold text-emerald-400">
                            {Number.isInteger(row.total) ? row.total : row.total.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </>
                  )
                ) : null}
              </tbody>
              {activeTab === 'manhour' && manHourView === 'matrix' && manHourData.rows.length > 0 && (
                <tfoot className="bg-slate-900 sticky bottom-0 z-10 shadow-[0_-1px_0_rgba(30,41,59,1)]">
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-slate-300 text-right">TOTAL</td>
                    {manHourData.columns.map(p => {
                      const pTotal = manHourData.projectTotals.get(p.id) || 0;
                      return (
                        <td key={p.id} className="py-2.5 px-2 text-center border-l border-slate-800/50 font-mono font-bold text-sky-400 text-[10px]">
                          {pTotal > 0 ? (Number.isInteger(pTotal) ? pTotal : pTotal.toFixed(1)) : '-'}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-3 text-center border-l border-slate-800/50 font-mono font-black text-emerald-400 text-[11px] bg-emerald-950/20">
                      {Number.isInteger(manHourData.grandTotal) ? manHourData.grandTotal : manHourData.grandTotal.toFixed(1)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* RIGHT: Workload Top 5 */}
        <div className="col-span-3 bg-slate-900/50 border border-slate-800 rounded-lg p-4 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-3 shrink-0">
            <h2 className="text-xs font-bold text-slate-300 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-rose-500"/>과부하 인력 (Workload Top 5)
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
            {workloadRankings.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-4">투입 데이터가 없습니다.</div>
            ) : (
              workloadRankings.map((rank, idx) => (
                <div key={rank.id} className="flex items-center bg-slate-800/40 p-2.5 rounded-lg border border-slate-700/50 relative overflow-hidden group">
                  <div className={`absolute top-0 left-0 w-1 h-full ${
                    idx === 0 ? 'bg-rose-500' : 
                    idx === 1 ? 'bg-orange-500' : 
                    idx === 2 ? 'bg-amber-500' : 
                    'bg-slate-600'
                  }`} />
                  
                  <div className="ml-2 flex-1 flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-200">
                        {idx + 1}. {rank.name}
                        {rank.isOffline && <span className="ml-1 text-[9px] text-amber-500 font-normal border border-amber-500/30 px-1 rounded-sm bg-amber-500/10">미가입</span>}
                      </span>
                      <span className="text-[10px] text-slate-400">현재 <span className="font-bold text-white">{rank.currentConcurrentProjects}</span>개 투입중</span>
                    </div>
                    
                    {/* Progress Bar (Visualizing workload against a max threshold say 5) */}
                    <div className="w-full bg-slate-700/50 rounded-full h-1.5 mt-0.5">
                      <div 
                        className={`h-1.5 rounded-full ${rank.currentConcurrentProjects > 2 ? 'bg-rose-500' : rank.currentConcurrentProjects > 1 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min((rank.currentConcurrentProjects / 5) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-1">누적 최대 병목: {rank.maxConcurrentProjects}회 중복</p>
                  </div>
                </div>
              ))
            )}
            
            <div className="mt-4 pt-3 border-t border-slate-800">
              <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                현재 일자를 기준으로 <br/> 동시 투입된 프로젝트가 많은 순서입니다.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
