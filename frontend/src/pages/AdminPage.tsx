// 설명: 관리자 전용 회원가입 승인, 사용자 관리, 팀 CRUD, 비밀번호 변경 및 데이터 백업/복원 페이지 컴포넌트

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getAllTeams, createTeam, updateTeam, deleteTeam } from '@/services/teamService';
import { exportSystemBackup, importSystemRestore } from '@/services/backupService';
import { UserProfile, Team } from '@/types';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  Clock,
  Search,
  CheckCircle2,
  Trash2,
  Building2,
  RefreshCw,
  Plus,
  Edit2,
  X,
  Download,
  Upload,
  Database,
  HardDrive,
  Cloud,
  FileJson,
  Info,
  KeyRound,
  Lock
} from 'lucide-react';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'users' | 'teams' | 'backup'>('pending');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [restoring, setRestoring] = useState(false);

  // 팀 CRUD 모달 상태
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamDisplayOrder, setTeamDisplayOrder] = useState<number>(0);

  // 관리자 비밀번호 변경 모달 상태
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    fetchUsersAndTeams();
  }, []);

  const fetchUsersAndTeams = async () => {
    try {
      setLoading(true);
      // 1. 전체 프로필 로드 (승인 대기 포함)
      const { data: usersData, error: usersErr } = await supabase
        .from('user_profiles')
        .select('*, team:teams(*)')
        .order('created_at', { ascending: false });

      if (usersErr) throw usersErr;
      setUsers(usersData || []);

      // 2. 전체 팀 로드
      const teamsData = await getAllTeams();
      setTeams(teamsData);
    } catch (error) {
      console.error('사용자/팀 목록 로드 실패:', error);
      toast.error('정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 회원 가입 승인 (is_active -> true)
  const handleApproveUser = async (userId: string, teamId?: string) => {
    try {
      const updateData: any = { is_active: true };
      if (teamId) updateData.team_id = teamId;

      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;
      toast.success('회원 가입이 성공적으로 승인되었습니다!');
      fetchUsersAndTeams();
    } catch (error) {
      console.error('승인 실패:', error);
      toast.error('승인 처리에 실패했습니다.');
    }
  };

  // 회원 거절 / 삭제 (관리자 계정은 삭제 불가)
  const handleRejectUser = async (userId: string, name: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (targetUser?.role === 'admin') {
      toast.error('🔒 관리자 계정은 삭제할 수 없습니다.');
      return;
    }

    if (!window.confirm(`정말 ${name} 님의 가입 요청을 거절하고 삭제하시겠습니까?`)) return;
    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      toast.success('가입 요청이 거절 및 삭제되었습니다.');
      fetchUsersAndTeams();
    } catch (error) {
      console.error('거절 실패:', error);
      toast.error('거절 처리에 실패했습니다.');
    }
  };

  // 소속 팀 변경
  const handleChangeUserTeam = async (userId: string, newTeamId: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ team_id: newTeamId || null })
        .eq('id', userId);

      if (error) throw error;
      toast.success('소속 팀이 변경되었습니다.');
      fetchUsersAndTeams();
    } catch (error) {
      toast.error('팀 변경에 실패했습니다.');
    }
  };

  // 권한 변경 (member <-> admin)
  const handleChangeUserRole = async (userId: string, newRole: 'member' | 'admin' | 'team_leader') => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      toast.success(`권한이 ${newRole === 'admin' ? '관리자' : '일반 회원'}로 변경되었습니다.`);
      fetchUsersAndTeams();
    } catch (error) {
      toast.error('권한 변경에 실패했습니다.');
    }
  };

  // 계정 활성/비활성 토글 (관리자 계정은 비활성화 불가)
  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    const targetUser = users.find((u) => u.id === userId);
    if (targetUser?.role === 'admin' && currentStatus === true) {
      toast.error('🔒 관리자 계정은 비활성화할 수 없습니다.');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      toast.success(`계정이 ${!currentStatus ? '활성화' : '비활성화'} 처리되었습니다.`);
      fetchUsersAndTeams();
    } catch (error) {
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  // --- 비밀번호 변경 처리 ---
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('새 비밀번호는 최소 6자리 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    try {
      setUpdatingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success('🔑 관리자 비밀번호가 성공적으로 변경되었습니다!');
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordModalOpen(false);
    } catch (error: any) {
      console.error('비밀번호 변경 실패:', error);
      toast.error(error.message || '비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  // --- 팀 CRUD 처리 ---
  const openAddTeamModal = () => {
    setEditingTeam(null);
    setTeamName('');
    setTeamDescription('');
    setTeamDisplayOrder(teams.length + 1);
    setIsTeamModalOpen(true);
  };

  const openEditTeamModal = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamDescription(team.description || '');
    setTeamDisplayOrder(team.display_order || 0);
    setIsTeamModalOpen(true);
  };

  const closeTeamModal = () => {
    setIsTeamModalOpen(false);
    setEditingTeam(null);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      toast.error('팀 이름을 입력해 주세요.');
      return;
    }

    try {
      if (editingTeam) {
        await updateTeam(editingTeam.id, {
          name: teamName.trim(),
          description: teamDescription.trim(),
          display_order: teamDisplayOrder
        });
        toast.success(`팀 정보가 '${teamName}'으로 수정되었습니다.`);
      } else {
        await createTeam({
          name: teamName.trim(),
          description: teamDescription.trim(),
          display_order: teamDisplayOrder
        });
        toast.success(`새로운 팀 '${teamName}'이 생성되었습니다!`);
      }
      closeTeamModal();
      fetchUsersAndTeams();
    } catch (error: any) {
      console.error('팀 저장 실패:', error);
      toast.error(error.message || '팀 정보 저장에 실패했습니다.');
    }
  };

  const handleDeleteTeam = async (team: Team) => {
    const memberCount = users.filter((u) => u.team_id === team.id).length;
    if (memberCount > 0) {
      if (!window.confirm(`⚠️ 경고: '${team.name}'에는 현재 ${memberCount}명의 소속 팀원이 있습니다.\n정말 삭제하시겠습니까? 팀 삭제 시 소속 팀원의 팀 지정이 해제됩니다.`)) {
        return;
      }
    } else {
      if (!window.confirm(`'${team.name}' 팀을 완전히 삭제하시겠습니까?`)) return;
    }

    try {
      await deleteTeam(team.id);
      toast.success(`'${team.name}' 팀이 성공적으로 삭제되었습니다.`);
      fetchUsersAndTeams();
    } catch (error) {
      console.error('팀 삭제 실패:', error);
      toast.error('팀 삭제에 실패했습니다.');
    }
  };

  // --- 백업 & 복원 처리 ---
  const handleExportBackup = async () => {
    try {
      await exportSystemBackup();
      toast.success('시스템 데이터 백업 파일(.json)이 정상적으로 다운로드되었습니다!');
    } catch (error) {
      console.error('백업 실패:', error);
      toast.error('백업 파일 생성 중 오류가 발생했습니다.');
    }
  };

  const handleImportRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('⚠️ 경고: 업로드한 백업 파일 내용으로 데이터베이스를 복원/업데이트합니다.\n계속하시겠습니까?')) {
      return;
    }

    try {
      setRestoring(true);
      const text = await file.text();
      const backupJson = JSON.parse(text);

      const result = await importSystemRestore(backupJson);
      toast.success(result.message);
      fetchUsersAndTeams();
    } catch (error: any) {
      console.error('복원 실패:', error);
      toast.error(error.message || '백업 파일 읽기 및 복원에 실패했습니다.');
    } finally {
      setRestoring(false);
      e.target.value = '';
    }
  };

  const pendingUsers = users.filter((u) => !u.is_active);
  const activeUsers = users.filter((u) => u.is_active);

  const filteredUsers = (activeTab === 'pending' ? pendingUsers : users).filter(
    (u) =>
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 헤더 배너 */}
      <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl overflow-hidden border border-white/10">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded-full gap-1.5 mb-3 border border-indigo-500/30">
              <ShieldCheck className="h-3.5 w-3.5" /> Administrator Management Mode
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">회원가입 승인, 조직 & 데이터 백업 관리</h1>
            <p className="mt-2 text-sm text-slate-300 max-w-xl">
              신규 회원 가입 승인, 전체 팀원 권한 지정, 조직 부서 관리 및 시스템 전체 데이터 백업/복원을 총괄합니다.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="inline-flex items-center px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-2xl gap-2 backdrop-blur-md border border-white/20 transition active:scale-95 shadow-md"
            >
              <KeyRound className="h-4 w-4 text-amber-300" /> 관리자 비밀번호 변경
            </button>

            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center">
              <p className="text-[11px] text-indigo-200 font-semibold">승인 대기</p>
              <p className="text-xl font-black text-amber-400 mt-0.5">{pendingUsers.length}명</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center">
              <p className="text-[11px] text-indigo-200 font-semibold">전체 팀원</p>
              <p className="text-xl font-black text-emerald-400 mt-0.5">{activeUsers.length}명</p>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 컨트롤 & 기능 버튼 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        {/* 탭 전환 버튼 4개 */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            승인 대기 목록
            {pendingUsers.length > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-full">
                {pendingUsers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="h-3.5 w-3.5 text-sky-500" />
            전체 사용자 관리 ({users.length}명)
          </button>

          <button
            onClick={() => setActiveTab('teams')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
              activeTab === 'teams'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Building2 className="h-3.5 w-3.5 text-indigo-500" />
            팀(부서) 관리 ({teams.length}개)
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
              activeTab === 'backup'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Database className="h-3.5 w-3.5 text-emerald-500" />
            💾 백업 & 복원
          </button>
        </div>

        {/* 우측 툴바 */}
        <div className="flex items-center gap-3">
          {activeTab !== 'teams' && activeTab !== 'backup' ? (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="이름 또는 이메일 검색..."
                className="pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition"
              />
            </div>
          ) : activeTab === 'teams' ? (
            <button
              onClick={openAddTeamModal}
              className="inline-flex items-center px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl gap-1.5 shadow-md shadow-sky-500/20 transition active:scale-95"
            >
              <Plus className="h-4 w-4" /> 신규 팀 추가
            </button>
          ) : null}

          <button
            onClick={fetchUsersAndTeams}
            className="p-2 text-slate-400 hover:text-sky-600 hover:bg-slate-50 rounded-xl transition"
            title="새로고침"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* --- TAB 1 & 2: 승인 대기 목록 & 전체 사용자 관리 --- */}
      {activeTab !== 'teams' && activeTab !== 'backup' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              {activeTab === 'pending'
                ? '승인 대기 중인 회원가입 요청이 없습니다. 🎉'
                : '검색 조건에 해당되는 사용자가 존재하지 않습니다.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 font-bold text-slate-600">
                  <tr>
                    <th className="px-6 py-4">사용자</th>
                    <th className="px-6 py-4">소속 팀</th>
                    <th className="px-6 py-4">권한</th>
                    <th className="px-6 py-4">상태</th>
                    <th className="px-6 py-4 text-right">승인 / 관리 작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => {
                    const initial = user.full_name ? user.full_name.charAt(0) : user.email.charAt(0);
                    const isAdmin = user.role === 'admin';

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm uppercase">
                              {initial}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-slate-900 text-sm">{user.full_name || '이름 미설정'}</p>
                                {isAdmin && (
                                  <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded gap-1 flex items-center">
                                    <Lock className="h-2.5 w-2.5" /> 관리자 (보호됨)
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-400 text-xs">{user.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            <select
                              value={user.team_id || ''}
                              onChange={(e) => handleChangeUserTeam(user.id, e.target.value)}
                              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                            >
                              <option value="">소속 팀 미배정</option>
                              {teams.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <select
                            value={user.role || 'member'}
                            onChange={(e) => handleChangeUserRole(user.id, e.target.value as any)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold border focus:outline-none ${
                              user.role === 'admin'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            <option value="member">일반 회원 (Member)</option>
                            <option value="admin">관리자 (Admin)</option>
                          </select>
                        </td>

                        <td className="px-6 py-4">
                          {user.is_active ? (
                            <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full gap-1 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" /> 사용 가능
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-full gap-1 border border-amber-200">
                              <Clock className="h-3 w-3 animate-pulse" /> 승인 대기중
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          {!user.is_active ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApproveUser(user.id, user.team_id || undefined)}
                                className="inline-flex items-center px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm gap-1 transition active:scale-95"
                              >
                                <UserCheck className="h-3.5 w-3.5" /> 승인하기
                              </button>
                              <button
                                onClick={() => handleRejectUser(user.id, user.full_name || user.email)}
                                className="inline-flex items-center px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-xs rounded-xl transition"
                              >
                                <UserX className="h-3.5 w-3.5" /> 거절
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              {/* 관리자 계정인 경우 비활성화 및 삭제 차단 UI */}
                              {isAdmin ? (
                                <span
                                  className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-400 text-[11px] font-bold rounded-lg gap-1 border border-slate-200 cursor-not-allowed"
                                  title="🔒 최고 관리자 계정은 비활성화 및 삭제할 수 없습니다."
                                >
                                  <Lock className="h-3 w-3" /> 비활성화/삭제 불가 (보호)
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleToggleActive(user.id, user.is_active)}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold rounded-lg transition"
                                  >
                                    {user.is_active ? '비활성화' : '활성화'}
                                  </button>
                                  <button
                                    onClick={() => handleRejectUser(user.id, user.full_name || user.email)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                    title="사용자 삭제"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 3: 팀(부서) 관리 --- */}
      {activeTab === 'teams' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-500" /> 등록된 조직 팀 목록 ({teams.length}개)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                주간 회의 보고서 작성 및 회원 가입에 사용되는 팀 명칭과 표시 순서를 수정하거나 새로 추가합니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {teams.map((team) => {
              const memberCount = users.filter((u) => u.team_id === team.id).length;
              return (
                <div
                  key={team.id}
                  className="p-5 border border-slate-100 rounded-2xl bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-md transition relative group flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        순서: {team.display_order || 0}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditTeamModal(team)}
                          className="p-1 text-slate-400 hover:text-sky-600 hover:bg-slate-100 rounded transition"
                          title="팀명 수정"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                          title="팀 삭제"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-lg mt-2">{team.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{team.description || '설명 없음'}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <Users className="h-3.5 w-3.5 text-sky-500" /> 소속 팀원 {memberCount}명
                    </span>
                    <button
                      onClick={() => openEditTeamModal(team)}
                      className="text-sky-600 font-bold hover:underline text-[11px]"
                    >
                      수정하기
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- TAB 4: 데이터 백업 및 복원 & 데이터 저장 위치 상세 설명 --- */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* 백업 & 복원 액션 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 백업 (JSON 내보내기) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <Download className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">시스템 데이터 전체 백업</h3>
                    <p className="text-xs text-slate-500 mt-0.5">JSON 형태의 안전한 백업 파일로 내보내기</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mt-4">
                  현재 데이터베이스에 저장된 8개 팀 정보, 사용자 프로필, 모든 주간 회의 보고서, 실적/계획 작업 및 Pending 추적 항목을 내 컴퓨터로 다운로드합니다.
                </p>
              </div>

              <button
                onClick={handleExportBackup}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-2xl shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-2 active:scale-95"
              >
                <FileJson className="h-4 w-4" /> 데이터 백업 파일 다운로드 (.json)
              </button>
            </div>

            {/* 복원 (JSON 가져오기) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">백업 파일 데이터 복원</h3>
                    <p className="text-xs text-slate-500 mt-0.5">이전에 저장한 JSON 백업 파일로 데이터 복원</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mt-4">
                  컴퓨터에 보관 중인 백업 파일(`.json`)을 업로드하여 과거 시점의 데이터를 복원하거나 시스템 데이터를 일괄 갱신합니다.
                </p>
              </div>

              <label className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-2xl shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-center">
                <Upload className="h-4 w-4" />
                {restoring ? '데이터 복원 처리 중...' : '백업 파일 선택 및 복원하기 (.json)'}
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportRestore}
                  disabled={restoring}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* 데이터 저장 위치 및 아키텍처 상세 안내 패널 */}
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">📌 작성한 데이터는 어디에 저장되나요? (저장 아키텍처 안내)</h3>
                <p className="text-xs text-slate-500 mt-0.5">시스템 데이터 저장소 및 파일 위치 상세 설명</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 1. Supabase Cloud DB */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="flex items-center gap-2 text-sky-600 font-extrabold text-sm">
                  <Cloud className="h-4 w-4" /> 1. 데이터베이스 (Cloud DB)
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  사용자가 작성한 <strong>모든 주간 보고서, 팀 정보, 회원 프로필, Pending 항목</strong>은 클라우드 보안 데이터베이스인 <strong>Supabase PostgreSQL Cloud Server</strong>에 실시간 암호화 저장됩니다.
                </p>
                <div className="text-[11px] text-slate-400 bg-white p-2.5 rounded-xl border border-slate-200/60 font-mono">
                  URL: qlvnroublnpotfukedji.supabase.co
                </div>
              </div>

              {/* 2. Google Drive Master Source */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-sm">
                  <HardDrive className="h-4 w-4" /> 2. 마스터 코드 저장소 (G: Drive)
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  시스템 소스코드, 데이터베이스 구조 파일(SQL), 마이그레이션 이력은 구글 드라이브 <strong>마스터 폴더</strong>에 실시간 보관됩니다.
                </p>
                <div className="text-[11px] text-slate-400 bg-white p-2.5 rounded-xl border border-slate-200/60 font-mono">
                  G:\내 드라이브\weekly-meeting-system
                </div>
              </div>

              {/* 3. Local High-speed Runtime */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-sm">
                  <Database className="h-4 w-4" /> 3. 고속 로컬 실행 환경 (C: Drive)
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  웹 서버의 고속 동작 및 동기화 락 방지를 위해 로컬 C 드라이브 고속 런타임 환경에서 시스템이 실행됩니다.
                </p>
                <div className="text-[11px] text-slate-400 bg-white p-2.5 rounded-xl border border-slate-200/60 font-mono">
                  C:\weekly-meeting-system\frontend
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 관리자 비밀번호 변경 모달 창 */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-zoomIn">
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-amber-400" />
                <h3 className="font-extrabold text-base">관리자 비밀번호 변경</h3>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">새 비밀번호 (최소 6자리 이상) *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="새 비밀번호를 입력하세요."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">새 비밀번호 확인 *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="새 비밀번호를 다시 입력하세요."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition"
                >
                  {updatingPassword ? '변경 처리 중...' : '비밀번호 변경 완료'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 팀 추가/수정 모달 창 */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-zoomIn">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">
                {editingTeam ? `'${editingTeam.name}' 팀 수정` : '새로운 팀(부서) 추가'}
              </h3>
              <button onClick={closeTeamModal} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">팀(부서) 명칭 *</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="예: 전략기획팀, SW개발팀, Team 9"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">팀 설명 (선택)</label>
                <textarea
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  placeholder="팀의 주요 업무나 역할을 입력하세요."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">표시 순서 (숫자)</label>
                <input
                  type="number"
                  value={teamDisplayOrder}
                  onChange={(e) => setTeamDisplayOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeTeamModal}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-lg transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm rounded-lg transition"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
