// 설명: 메인 애플리케이션 컴포넌트 및 라우팅 설정

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TeamUpdate from './pages/TeamUpdate';
import PendingTracker from './pages/PendingTracker';
import WeeklyReport from './pages/WeeklyReport';
import AdminPage from './pages/AdminPage';
import Login from './pages/Login';
import { useAuthStore } from './stores/authStore';
import { useEffect } from 'react';

function App() {
  const { user, userProfile, loading, initialize } = useAuthStore();

  // 설명: 앱 초기화 시 인증 상태 확인
  useEffect(() => {
    initialize();
  }, [initialize]);

  // 설명: 로딩 중일 때 표시할 화면
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 설명: 로그인하지 않은 사용자는 로그인 페이지로 리다이렉트
  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // 설명: 가입 승인 대기 중인 사용자는 전용 대기 화면 표시
  if (userProfile && !userProfile.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 px-4">
        <div className="max-w-md w-full text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/20 rounded-full mb-4">
            <span className="text-3xl animate-pulse">⏳</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">가입 승인 대기 중</h2>
          <p className="mt-3 text-slate-300 text-sm leading-relaxed">
            <span className="font-semibold text-sky-400">{userProfile.full_name || userProfile.email}</span>님의 회원가입 신청이 정상적으로 접수되었습니다.
          </p>
          <p className="mt-2 text-slate-300 text-sm">
            소속 요청 팀: <span className="font-semibold text-sky-400">{userProfile.team?.name || '지정되지 않음'}</span>
          </p>
          <p className="mt-4 text-xs text-slate-400 leading-relaxed">
            시스템 관리자가 가입을 승인하면 즉시 주간회의 시스템을 이용하실 수 있습니다. 가입이 승인된 후 브라우저를 새로고침(F5) 해주세요.
          </p>
          <button
            onClick={() => useAuthStore.getState().signOut()}
            className="mt-6 w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition"
          >
            로그아웃 후 다른 계정으로 로그인
          </button>
        </div>
      </div>
    );
  }

  // 설명: 로그인한 사용자에게 보여줄 메인 애플리케이션
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* 대시보드 - 전체 팀 현황 */}
          <Route path="/" element={<Dashboard />} />
          
          {/* 팀별 업데이트 작성 */}
          <Route path="/team/:teamId" element={<TeamUpdate />} />
          
          {/* Pending 추적 관리 */}
          <Route path="/pending" element={<PendingTracker />} />
          
          {/* 주간회의 리포트 */}
          <Route path="/report" element={<WeeklyReport />} />
          
          {/* 회원가입 승인 및 관리자 전용 사용자 관리 */}
          <Route path="/admin" element={<AdminPage />} />
          
          {/* 잘못된 경로는 대시보드로 리다이렉트 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      
      {/* 설명: Toast 알림을 위한 컨테이너 */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </BrowserRouter>
  );
}

export default App;
