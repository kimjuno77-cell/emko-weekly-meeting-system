// 설명: 전체 페이지 레이아웃 컴포넌트 (좌우 상단 수평 맞춤 및 프리미엄 헤더 적용)

import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  FileText,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Calendar,
  Rocket,
  Briefcase
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import GuideModal from './GuideModal';
import { BookOpen } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { userProfile, signOut } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      fetchPendingCount();
    }
  }, [userProfile]);

  const fetchPendingCount = async () => {
    try {
      const { count, error } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', false);
      if (!error && count !== null) {
        setPendingCount(count);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 설명: 네비게이션 메뉴 항목
  const navigation = [
    {
      name: '대시보드',
      href: '/',
      icon: LayoutDashboard,
      current: location.pathname === '/',
    },
    {
      name: '프로젝트 관리',
      href: '/projects',
      icon: Rocket,
      current: location.pathname.startsWith('/projects'),
    },
    {
      name: '인력 투입(M-Plan)',
      href: '/mobilization',
      icon: Briefcase,
      current: location.pathname.startsWith('/mobilization'),
    },
    {
      name: '주간업무 작성',
      href: '/update',
      icon: Users,
      current: location.pathname.startsWith('/update'),
    },
    {
      name: 'Pending 추적',
      href: '/pending',
      icon: CheckSquare,
      current: location.pathname === '/pending',
    },
    {
      name: '주간회의 리포트',
      href: '/report',
      icon: FileText,
      current: location.pathname === '/report',
    },
  ];

  if (userProfile?.role === 'admin') {
    navigation.push({
      name: '회원 승인 관리',
      href: '/admin',
      icon: ShieldCheck,
      current: location.pathname === '/admin',
      badge: pendingCount,
    } as any);
  }

  // 설명: 로그아웃 처리
  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('로그아웃되었습니다.');
    } catch (error) {
      toast.error('로그아웃 실패');
    }
  };

  // 오늘 날짜 텍스트
  const todayText = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 모바일 사이드바 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* 사이드바 (좌측) */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 shadow-sm transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto flex flex-col flex-shrink-0`}
      >
        <div className="flex flex-col h-full">
          {/* 사이드바 상단 헤더 (높이 h-16으로 우측 상단바와 100% 동일 맞춤) */}
          <div className="h-16 px-6 bg-slate-900 text-white flex items-center justify-between flex-shrink-0 border-b border-slate-800">
            <h1 className="text-base font-black tracking-tight flex items-center gap-2">
              <span className="h-2.5 w-2.5 bg-sky-400 rounded-full animate-pulse"></span>
              주간회의 시스템
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 사용자 프로필 정보 */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">로그인 사용자</p>
              {userProfile?.role === 'admin' && (
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200/60 rounded-full">
                  👑 관리자
                </span>
              )}
            </div>
            <p className="font-extrabold text-slate-900 text-sm mt-1 truncate">
              {userProfile?.full_name || userProfile?.email}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              {userProfile?.team?.name || '소속 팀 미배정'}
            </p>
          </div>

          {/* 네비게이션 메뉴 */}
          <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
            {navigation.map((item: any) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`${
                    item.current
                      ? 'bg-sky-50 text-sky-700 font-extrabold border border-sky-100 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100/80 font-semibold hover:text-slate-900'
                  } group flex items-center justify-between px-3.5 py-2.5 text-xs rounded-xl transition-all`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`${
                        item.current ? 'text-sky-600' : 'text-slate-400 group-hover:text-slate-600'
                      } h-4 w-4`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-black bg-amber-500 text-white rounded-full animate-pulse shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* 하단 로그아웃 버튼 */}
          <div className="p-3 border-t border-slate-100 bg-white">
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-3.5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors gap-3"
            >
              <LogOut className="h-4 w-4 text-slate-400 group-hover:text-rose-600" />
              로그아웃
            </button>
          </div>
        </div>
      </aside>

      {/* 우측 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* 우측 상단 톱바 (높이 h-16으로 좌측 헤더와 100% 동일 수평 맞춤) */}
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-600 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline-block">System</span>
              <span className="text-slate-300 hidden sm:inline-block">/</span>
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-800">
                주간 업데이트 취합 & Pending 추적 관리
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl border border-sky-200/60 text-xs font-bold transition shadow-sm"
              title="시스템 작성 가이드 보기"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline-block">작성 가이드</span>
            </button>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/80 rounded-xl border border-slate-200/60 text-xs font-semibold text-slate-600">
              <Calendar className="h-3.5 w-3.5 text-sky-500" />
              <span>{todayText}</span>
            </div>
          </div>
        </header>

        {/* 실제 페이지 콘텐츠 영역 */}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* 작성 가이드 모달 */}
      <GuideModal 
        isOpen={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)} 
      />
    </div>
  );
};

export default Layout;
