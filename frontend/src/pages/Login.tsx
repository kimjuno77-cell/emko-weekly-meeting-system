// 설명: 로그인 및 회원가입 페이지 컴포넌트

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getAllTeams } from '@/services/teamService';
import { Team } from '@/types';
import toast from 'react-hot-toast';
import { LogIn, UserPlus } from 'lucide-react';

const Login = () => {
  const { signIn, signUp } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  
  // 공통 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 회원가입 상태
  const [fullName, setFullName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);

  // 설명: 회원가입용 팀 목록 조회
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const teamsList = await getAllTeams();
        setTeams(teamsList);
        if (teamsList.length > 0) {
          setSelectedTeam(teamsList[0].id);
        }
      } catch (err) {
        console.error('팀 목록 로드 실패:', err);
      }
    };
    fetchTeams();
  }, []);

  // 설명: 로그인 처리
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success('로그인 성공!');
    } catch (error) {
      console.error('로그인 에러:', error);
      toast.error(error instanceof Error ? error.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 설명: 회원가입 처리
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName || !selectedTeam) {
      toast.error('모든 정보를 입력해주세요.');
      return;
    }
    if (password.length < 6) {
      toast.error('비밀번호는 최소 6자리 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, fullName, selectedTeam);
      toast.success('회원가입이 완료되었습니다. 관리자의 승인을 기다려주세요!');
      // 가입 후 메인 화면으로 리다이렉트되면 App.tsx에서 가입 대기 화면이 표시됨
    } catch (error) {
      console.error('회원가입 에러:', error);
      toast.error(error instanceof Error ? error.message : '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 px-4 py-12">
      <div className="max-w-md w-full">
        {/* 로고 및 제목 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-sky-500 to-indigo-500 rounded-2xl shadow-lg shadow-sky-500/20 mb-4 animate-bounce duration-3000">
            {activeTab === 'login' ? (
              <LogIn className="h-8 w-8 text-white" />
            ) : (
              <UserPlus className="h-8 w-8 text-white" />
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-clip-text bg-gradient-to-r from-sky-200 to-white">
            주간회의 취합 시스템
          </h1>
          <p className="mt-2 text-sm text-sky-200/70">
            8개 팀의 주간 업데이트 취합 및 Pending 추적 관리
          </p>
        </div>

        {/* 메인 박스 */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 p-8">
          {/* 탭 버튼 */}
          <div className="flex bg-slate-950/40 p-1.5 rounded-xl mb-6">
            <button
              onClick={() => {
                setActiveTab('login');
                toast.dismiss();
              }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'login'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => {
                setActiveTab('signup');
                toast.dismiss();
              }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'signup'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              회원가입
            </button>
          </div>

          {activeTab === 'login' ? (
            /* 로그인 폼 */
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div>
                <label htmlFor="login-email" className="block text-xs font-semibold text-slate-300 mb-2">
                  이메일 주소
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/30 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  placeholder="your@email.com"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-semibold text-slate-300 mb-2">
                  비밀번호
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/30 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 mt-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-sky-500/20 active:scale-[0.98] transition disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </form>
          ) : (
            /* 회원가입 폼 */
            <form onSubmit={handleSignupSubmit} className="space-y-5">
              <div>
                <label htmlFor="signup-name" className="block text-xs font-semibold text-slate-300 mb-2">
                  이름
                </label>
                <input
                  id="signup-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/30 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  placeholder="홍길동"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="signup-email" className="block text-xs font-semibold text-slate-300 mb-2">
                  이메일 주소
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/30 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  placeholder="your@email.com"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="signup-password" className="block text-xs font-semibold text-slate-300 mb-2">
                  비밀번호 (6자 이상)
                </label>
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/30 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="signup-team" className="block text-xs font-semibold text-slate-300 mb-2">
                  소속 팀 선택
                </label>
                <select
                  id="signup-team"
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/30 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition [&>option]:bg-slate-900 [&>option]:text-white"
                  disabled={loading}
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.description || '팀'})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 mt-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-sky-500/20 active:scale-[0.98] transition disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? '가입 신청 중...' : '회원가입 및 가입 승인 요청'}
              </button>
            </form>
          )}

          {/* 안내 문구 */}
          <div className="mt-6 pt-5 border-t border-white/10 text-center text-xs text-sky-200/50">
            {activeTab === 'login' ? (
              <p>처음이신가요? 회원가입 후 관리자에게 가입 승인을 요청하세요.</p>
            ) : (
              <p>회원가입 완료 시 가입 승인이 접수되며, 관리자 승인 후 즉시 사용 가능합니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
