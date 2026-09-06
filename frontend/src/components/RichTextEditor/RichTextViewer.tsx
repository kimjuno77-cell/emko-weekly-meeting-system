// 설명: 저장된 서식 있는 본문(HTML) 및 일반 텍스트를 아름답게 렌더링하고 이미지 확대(라이트박스)를 지원하는 뷰어 컴포넌트

import React, { useState } from 'react';
import { X, ZoomIn, Download } from 'lucide-react';

interface RichTextViewerProps {
  content?: string | null; // 렌더링할 본문 내용 (HTML 또는 일반 텍스트)
  className?: string; // 추가 CSS 클래스
  compact?: boolean; // 카드 목록 등에서 간결하게 표시할지 여부
}

export const RichTextViewer: React.FC<RichTextViewerProps> = ({
  content,
  className = '',
  compact = false
}) => {
  // 설명: 확대해서 볼 이미지의 URL 상태 (null이면 모달 닫힘)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  // 설명: 내용이 없으면 아무것도 표시하지 않습니다.
  if (!content || content.trim() === '') {
    return null;
  }

  // 설명: 내용에 HTML 태그가 포함되어 있는지 정규식으로 검사합니다.
  const isHtml = /<[a-z][\s\S]*>/i.test(content);

  // 설명: 본문 내 이미지 클릭 시 라이트박스 모달을 띄우는 이벤트 핸들러
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // 설명: 클릭된 요소가 이미지(IMG)인 경우 해당 이미지의 src를 상태로 설정하여 모달을 엽니다.
    if (target.tagName === 'IMG') {
      const img = target as HTMLImageElement;
      setSelectedImageUrl(img.src);
    }
  };

  return (
    <>
      <div
        className={`rich-text-viewer text-slate-700 leading-relaxed break-words ${className}`}
        onClick={handleContentClick}
      >
        {isHtml ? (
          // 설명: HTML 서식이 있는 리치 텍스트 렌더링
          <div
            className={`prose-sm max-w-none 
              [&_h1]:text-base [&_h1]:font-black [&_h1]:text-slate-900 [&_h1]:my-1.5
              [&_h2]:text-sm [&_h2]:font-extrabold [&_h2]:text-slate-800 [&_h2]:my-1
              [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-slate-800 [&_h3]:my-1
              [&_p]:my-1 [&_p]:leading-normal
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ul]:space-y-0.5
              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_ol]:space-y-0.5
              [&_blockquote]:border-l-4 [&_blockquote]:border-sky-400 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-500 [&_blockquote]:my-1.5
              [&_img]:rounded-xl [&_img]:border [&_img]:border-slate-200 [&_img]:my-2 [&_img]:cursor-zoom-in [&_img]:hover:opacity-90 [&_img]:transition
              ${compact ? '[&_img]:max-h-24 [&_img]:object-cover line-clamp-3' : '[&_img]:max-h-96 [&_img]:object-contain'}
              [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sky-600 [&_code]:font-mono [&_code]:text-[11px]
              [&_hr]:border-slate-200 [&_hr]:my-2
            `}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          // 설명: 기존에 작성된 일반 텍스트(Plain Text) 하위 호환 처리: 줄바꿈 유지
          <p className={`whitespace-pre-wrap leading-normal ${compact ? 'line-clamp-2' : ''}`}>
            {content}
          </p>
        )}
      </div>

      {/* 설명: 이미지 클릭 시 크게 보여주는 라이트박스(Lightbox) 모달 */}
      {selectedImageUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedImageUrl(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl p-2 overflow-hidden flex flex-col items-center"
            onClick={(e) => e.stopPropagation()} // 모달 내부 클릭 시 닫힘 방지
          >
            {/* 설명: 상단 닫기 및 다운로드 툴바 */}
            <div className="w-full flex items-center justify-between px-3 py-2 border-b border-slate-100 mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ZoomIn className="h-4 w-4 text-sky-500" /> 이미지 원본 미리보기
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={selectedImageUrl}
                  download="meeting_image.jpg"
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                  title="이미지 다운로드"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedImageUrl(null)}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="닫기"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* 설명: 원본 이미지 뷰어 영역 */}
            <div className="overflow-auto max-h-[80vh] flex items-center justify-center p-1">
              <img
                src={selectedImageUrl}
                alt="확대 이미지"
                className="max-w-full max-h-[78vh] object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RichTextViewer;
