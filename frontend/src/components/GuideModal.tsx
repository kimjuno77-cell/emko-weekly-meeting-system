import { X, BookOpen, CheckCircle, Info } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GuideModal = ({ isOpen, onClose }: GuideModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
        onClick={onClose}
      ></div>
      
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 text-sky-600 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-800">시스템 이용 가이드</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-8 bg-white">
          
          <section>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-600 text-xs font-black">1</span>
              팀 및 프로젝트 선택 규칙
            </h3>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong className="text-slate-900">✅ 프로젝트 전담 팀:</strong> 팀을 선택하면 프로젝트가 자동으로 매핑되어 별도 선택이 필요 없습니다.
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong className="text-slate-900">✅ 공통업무 팀 (예: 기술품질팀 등):</strong> 담당하시는 여러 프로젝트 단위로 업무를 분리하여 작성하셔야 합니다. 주간업무 작성 상단의 <strong>[프로젝트 직접 입력]</strong> 드롭다운에서 현재 작성할 프로젝트를 먼저 선택해 주세요.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 text-xs font-black">2</span>
              업무 작성 및 Pending(현안) 관리
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-slate-800">진행(Progress) / 이슈(Issue) / 계획(Plan)</p>
                  <p className="text-sm text-slate-600 mt-1">업무 성격에 맞게 탭을 선택하고 진행률과 담당자를 지정하세요.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-slate-800">장기 미해결(Pending) 자동 연동</p>
                  <p className="text-sm text-slate-600 mt-1">작업 등록 창 하단의 <strong>[Pending 항목으로 동시 등록]</strong> 체크박스를 선택하면, 주간업무에 등록함과 동시에 Pending 추적 메뉴에도 자동으로 연동되어 관리됩니다.</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-black">3</span>
              주간회의 리포트 (2주간 비교)
            </h3>
            <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 flex items-start gap-3">
              <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <p className="text-sm text-indigo-900 leading-relaxed">
                <strong>주간회의 리포트</strong> 메뉴에서 우측 상단의 <strong>[2주간 비교 보기]</strong> 토글을 켜면, 지난주 보고 내용과 이번 주 보고 내용을 한 화면에 나란히 배치하여 변동 사항을 쉽게 확인할 수 있습니다.
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm shadow-sky-600/20"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuideModal;
