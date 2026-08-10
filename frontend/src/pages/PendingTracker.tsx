// ?�명: Pending ??�� 추적 관�??�이지 컴포?�트 (명확????��/?�정 ?�션 버튼 �???�� 기능 보강)

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  createPendingItem,
  updatePendingItem,
  completePendingItem,
  deletePendingItem
} from '@/services/pendingService';
import { getAllTeams } from '@/services/teamService';
import { PendingItem, Team, UserProfile, PriorityLevel, PendingStatus } from '@/types';
import toast from 'react-hot-toast';
import {
  Circle,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  X,
  Calendar,
  CheckCircle2,
  Search
} from 'lucide-react';

const PendingTracker = () => {
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // ?�터 ?�태
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  // 모달 ?�태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PendingItem | null>(null);

  // ???�력 ?�드
  const [itemTeamId, setItemTeamId] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemAssignee, setItemAssignee] = useState('');
  const [itemTargetDate, setItemTargetDate] = useState('');
  const [itemPriority, setItemPriority] = useState<PriorityLevel>('medium');
  const [itemStatus, setItemStatus] = useState<PendingStatus>('pending');
  const [itemNotes, setItemNotes] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, [showCompleted]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // 1. Pending ??�� 직접 조회 (?�요 ???�료 ?��? 조건 반영)
      let query = supabase
        .from('pending_items')
        .select(`
          *,
          team:teams(*),
          assignee:user_profiles!assigned_to(*),
          creator:user_profiles!created_by(*),
          related_task:tasks(*)
        `);
      
      if (!showCompleted) {
        query = query.eq('is_completed', false);
      }
      
      const { data: pendingData, error: pendingErr } = await query
        .order('priority', { ascending: true })
        .order('target_date', { ascending: true });

      if (pendingErr) throw pendingErr;
      setPendingItems(pendingData || []);

      // 2. ?�체 ?� 목록 로드
      const teamsData = await getAllTeams();
      setTeams(teamsData);

      // 3. ?�체 ?��? 목록 로드 (?�당??지?�을 ?�함)
      const { data: usersData, error: usersErr } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('is_active', true);
      
      if (!usersErr && usersData) {
        setUsers(usersData);
      }
    } catch (error) {
      console.error('?�이??조회 ?�패:', error);
      toast.error('?�보�?불러?�는???�패?�습?�다.');
    } finally {
      setLoading(false);
    }
  };

  // 모달 ?�어
  const openAddModal = () => {
    setEditingItem(null);
    setItemTeamId(teams[0]?.id || '');
    setItemTitle('');
    setItemDesc('');
    setItemAssignee('');
    setItemTargetDate('');
    setItemPriority('medium');
    setItemStatus('pending');
    setItemNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: PendingItem) => {
    setEditingItem(item);
    setItemTeamId(item.team_id);
    setItemTitle(item.title);
    setItemDesc(item.description || '');
    setItemAssignee(item.assigned_to || '');
    setItemTargetDate(item.target_date || '');
    setItemPriority(item.priority);
    setItemStatus(item.status);
    setItemNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  // ?�??처리
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle || !itemTeamId) {
      toast.error('?��??�목???�수 ?�력??주세??');
      return;
    }

    try {
      if (editingItem) {
        // ?�정
        await updatePendingItem(editingItem.id, {
          team_id: itemTeamId,
          title: itemTitle,
          description: itemDesc,
          assigned_to: itemAssignee || undefined,
          target_date: itemTargetDate || undefined,
          priority: itemPriority,
          status: itemStatus,
          notes: itemNotes
        });
        
        // ?�태 ?�료 ?��? 체크
        if (itemStatus === 'completed' && !editingItem.is_completed) {
          await completePendingItem(editingItem.id);
        }
        
        toast.success('Pending ??��???�정?�었?�니??');
      } else {
        // 추�?
        await createPendingItem({
          team_id: itemTeamId,
          title: itemTitle,
          description: itemDesc,
          assigned_to: itemAssignee || undefined,
          target_date: itemTargetDate || undefined,
          priority: itemPriority,
          status: itemStatus,
          notes: itemNotes
        });
        toast.success('??Pending ??��???�록?�었?�니??');
      }
      
      closeModal();
      fetchInitialData();
    } catch (error: any) {
      console.error('Pending ?�???�러:', error);
      toast.error(error.message || '?�?�에 ?�패?�습?�다.');
    }
  };

  // ?�료 ?��? 처리
  const handleToggleComplete = async (item: PendingItem) => {
    try {
      if (item.is_completed) {
        // ?�료 ?�제 -> 'pending' ?�태�??�환
        await updatePendingItem(item.id, {
          status: 'pending',
          is_completed: false,
          completed_date: undefined as any
        } as any);
        toast.success('?�료 ?�제 처리?�었?�니??');
      } else {
        // ?�료 처리
        await completePendingItem(item.id);
        toast.success('?�업???�료 처리?�었?�니??');
      }
      fetchInitialData();
    } catch (error) {
      toast.error('?�태 변경에 ?�패?�습?�다.');
    }
  };

  // ??�� 처리
  const handleDeleteItem = async (itemId: string, itemTitle?: string) => {
    const titlePrompt = itemTitle ? `'${itemTitle}'` : '??Pending';
    if (!window.confirm(`${titlePrompt} ??��???�말�??�구 ??��?�시겠습?�까?`)) return;
    try {
      await deletePendingItem(itemId);
      toast.success('Pending ??��???�공?�으�???��?�었?�니??');
      if (editingItem && editingItem.id === itemId) {
        closeModal();
      }
      fetchInitialData();
    } catch (error: any) {
      console.error('Pending ??�� ?�러:', error);
      toast.error(error.message || '??��???�패?�습?�다.');
    }
  };

  // ?�터�??�용??목록 계산
  const filteredItems = pendingItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesTeam = selectedTeamFilter ? item.team_id === selectedTeamFilter : true;
    const matchesPriority = selectedPriorityFilter ? item.priority === selectedPriorityFilter : true;

    return matchesSearch && matchesTeam && matchesPriority;
  });

  // ?�늘 ?�짜 구하�?(?�체 체크??
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ?�단 ?�?��? */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Pending 추적 관�?/h1>
          <p className="mt-1 text-sm text-slate-500">
            �??�??미해�?과제?� 중요 ?�건???�록?�고, 목표 기한 ??조치?????�도�?관리합?�다.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-xl gap-2 shadow-lg shadow-sky-500/10 transition active:scale-95"
        >
          <Plus className="h-4 w-4" /> ??Pending ?�록
        </button>
      </div>

      {/* ?�터 �?*/}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {/* 검???�터 */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ID, ?�목, ?�용 검??.."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition"
            />
          </div>

          {/* ?� ?�터 */}
          <div>
            <select
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition"
            >
              <option value="">모든 ?� 보기</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* ?�선?�위 ?�터 */}
          <div>
            <select
              value={selectedPriorityFilter}
              onChange={(e) => setSelectedPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition"
            >
              <option value="">모든 ?�선?�위</option>
              <option value="high">?�음 (High)</option>
              <option value="medium">중간 (Medium)</option>
              <option value="low">??�� (Low)</option>
            </select>
          </div>

          {/* ?�료 ??�� 보기 ?��? */}
          <div className="flex items-center justify-end">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded text-sky-500 focus:ring-sky-500 h-4 w-4"
              />
              ?�료????�� ?�함
            </label>
          </div>
        </div>
      </div>

      {/* Pending ??�� 목록 */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-4">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              ?�록?�거??추적 중인 Pending ?�건??존재?��? ?�습?�다. ?��
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const isOverdue =
                  !item.is_completed && item.target_date && item.target_date < todayStr;
                const assigneeInitial = item.assignee?.full_name
                  ? item.assignee.full_name.charAt(0)
                  : '?';

                return (
                  <div
                    key={item.id}
                    className={`p-5 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      item.is_completed
                        ? 'bg-slate-50/50 border-slate-100 opacity-60'
                        : isOverdue
                        ? 'bg-rose-50/30 border-rose-200'
                        : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-md'
                    }`}
                  >
                    {/* ?�태 체크박스 & 주요 ?�보 */}
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => handleToggleComplete(item)}
                        className="mt-0.5 text-slate-400 hover:text-emerald-500 transition"
                        title={item.is_completed ? '?�료 ?�제' : '?�료 처리'}
                      >
                        {item.is_completed ? (
                          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        ) : (
                          <Circle className="h-6 w-6 hover:fill-slate-50" />
                        )}
                      </button>

                      {/* ?�보 ?�스??*/}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {item.item_id}
                          </span>
                          <span className="text-slate-400 font-semibold">{item.team?.name}</span>
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md ${
                              item.priority === 'high'
                                ? 'bg-red-50 text-red-600 border border-red-100'
                                : item.priority === 'medium'
                                ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                : 'bg-slate-50 text-slate-500 border border-slate-100'
                            }`}
                          >
                            ?�선?�위: {item.priority === 'high' ? '?�음' : item.priority === 'medium' ? '중간' : '??��'}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md ${
                              item.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                : item.status === 'in_progress'
                                ? 'bg-sky-50 text-sky-600 border border-sky-100'
                                : item.status === 'waiting'
                                ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                : 'bg-slate-50 text-slate-500 border border-slate-100'
                            }`}
                          >
                            ?�태: {item.status === 'completed' ? '?�료' : item.status === 'in_progress' ? '조치�? : item.status === 'waiting' ? '?�기중' : '?�수'}
                          </span>
                        </div>

                        <h3 className={`font-bold text-base text-slate-900 leading-snug ${item.is_completed ? 'line-through text-slate-400' : ''}`}>
                          {item.title}
                        </h3>

                        {item.description && (
                          <p className="text-xs text-slate-500 max-w-2xl whitespace-pre-wrap mt-1">
                            {item.description}
                          </p>
                        )}

                        {item.notes && (
                          <p className="text-[11px] text-amber-600 bg-amber-50/50 inline-block px-2 py-0.5 rounded-md mt-2">
                            ?�� 메모: {item.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 메�? ?�보 �??�션 */}
                    <div className="flex flex-wrap items-center justify-between md:justify-end gap-6 pl-10 md:pl-0 border-t border-slate-50 md:border-0 pt-4 md:pt-0">
                      {/* 목표 기한 */}
                      <div className="flex items-center gap-2 text-xs">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-500">목표 기한:</span>
                        <span className={`font-semibold ${isOverdue ? 'text-rose-600 animate-pulse' : 'text-slate-700'}`}>
                          {item.target_date || '기한 ?�음'}
                        </span>
                        {isOverdue && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[9px] font-bold rounded-md flex items-center gap-0.5">
                            <AlertCircle className="h-3 w-3" /> ?�체
                          </span>
                        )}
                        {item.is_completed && item.completed_date && (
                          <span className="text-emerald-600 text-[11px]">
                            ({item.completed_date} ?�료)
                          </span>
                        )}
                      </div>

                      {/* ?�당???�바?� */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <div className="h-6 w-6 bg-sky-100 text-sky-700 rounded-full flex items-center justify-center font-bold text-[10px] uppercase">
                          {assigneeInitial}
                        </div>
                        <span className="font-semibold">{item.assignee?.full_name || '미배??}</span>
                      </div>

                      {/* ?�정/??�� ?�션 버튼 (??�� 명확???�시) */}
                      <div className="flex items-center gap-1.5 border-l border-slate-100 pl-3">
                        <button
                          onClick={() => openEditModal(item)}
                          className="px-2.5 py-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition flex items-center gap-1 text-xs font-bold border border-slate-200/60"
                          title="?�정?�기"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>?�정</span>
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.title)}
                          className="px-2.5 py-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition flex items-center gap-1 text-xs font-bold border border-rose-200/60"
                          title="??��?�기"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>??��</span>
                        </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CRUD 모달 �?*/}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-zoomIn">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">
                {editingItem ? 'Pending ??�� ?�정' : '??Pending 추�?'}
              </h3>
              <button onClick={closeModal} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">?�속 ?� ?�택 *</label>
                <select
                  required
                  value={itemTeamId}
                  onChange={(e) => setItemTeamId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                >
                  <option value="">?� ?�택</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">?�목 *</label>
                <input
                  type="text"
                  required
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="?? API 게이?�웨??보안 ?�증 ?�류 ?�결"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">?�명 �??��? 계획 (?�택)</label>
                <textarea
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  placeholder="?��??�인 ?�슈 ?�명�??�결 계획???�성??주세??"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">?�당??/label>
                  <select
                    value={itemAssignee}
                    onChange={(e) => setItemAssignee(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  >
                    <option value="">미배??/option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.team?.name || '미배??})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">목표 기한</label>
                  <input
                    type="date"
                    value={itemTargetDate}
                    onChange={(e) => setItemTargetDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">?�선?�위</label>
                  <select
                    value={itemPriority}
                    onChange={(e) => setItemPriority(e.target.value as PriorityLevel)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  >
                    <option value="high">?�음 (High)</option>
                    <option value="medium">중간 (Medium)</option>
                    <option value="low">??�� (Low)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">진행 ?�태</label>
                  <select
                    value={itemStatus}
                    onChange={(e) => setItemStatus(e.target.value as PendingStatus)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  >
                    <option value="pending">?�수 (Pending)</option>
                    <option value="in_progress">조치�?(In Progress)</option>
                    <option value="waiting">?�기중 (Waiting)</option>
                    <option value="completed">?�료 (Completed)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">비고 �?메모 (?�택)</label>
                <input
                  type="text"
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="?�이?�항?�나 추�? 메모�??�력?�세??"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                {editingItem && (
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(editingItem.id, editingItem.title)}
                    className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-sm rounded-lg transition flex items-center gap-1"
                  >
                    <Trash2 className="h-4 w-4" /> ??��
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-lg transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm rounded-lg transition"
                >
                  ?�??                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingTracker;

