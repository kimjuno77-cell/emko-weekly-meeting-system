// 설명: TipTap 기반의 고성능 리치 텍스트 에디터 컴포넌트 (캡처화면 Ctrl+V 붙여넣기, 이미지 파일 첨부/드롭, 서식 툴바 지원)

import React, { useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Code,
  Undo,
  Redo,
  Image as ImageIcon,
  RemoveFormatting
} from 'lucide-react';
import toast from 'react-hot-toast';
import { compressImage, extractImagesFromClipboard, extractImagesFromDrop } from './imageUtils';

interface RichTextEditorProps {
  value: string; // 에디터 본문 내용 (HTML)
  onChange: (content: string) => void; // 내용 변경 시 호출되는 콜백 함수
  placeholder?: string; // 안내 문구
  minHeight?: string; // 편집 영역 최소 높이
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = '세부 추진 내용 및 현황 정보를 입력하세요. (캡처화면 Ctrl+V 붙여넣기 가능)',
  minHeight = '180px'
}) => {
  // 설명: 숨김 처리된 파일 입력 요소를 제어하기 위한 Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 설명: TipTap 에디터 인스턴스 초기화 및 확장 기능 구성
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Underline,
      Image.configure({
        inline: true,
        allowBase64: true
      }),
      Placeholder.configure({
        placeholder
      })
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      // 설명: 에디터의 내용이 비어있는 경우 빈 문자열을, 아니면 HTML 문자열을 부모 컴포넌트에 전달합니다.
      const html = editor.isEmpty ? '' : editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: `focus:outline-none text-xs text-slate-800 p-3.5 space-y-1.5 leading-relaxed`,
        style: `min-height: ${minHeight};`
      },
      // 설명: 클립보드 붙여넣기(Paste) 시 캡처된 이미지가 있는지 감지하여 자동 압축 후 삽입합니다.
      handlePaste: (view, event) => {
        const images = extractImagesFromClipboard(event);
        if (images.length > 0) {
          event.preventDefault();

          // 설명: 각 이미지 파일을 브라우저 캔버스로 자동 압축하여 Base64로 변환 후 에디터에 삽입합니다.
          images.forEach(async (file) => {
            try {
              toast.loading('캡처 이미지를 최적화하는 중...', { id: 'paste-img' });
              const base64Url = await compressImage(file, { maxWidth: 1200, quality: 0.85 });

              // 설명: 에디터 현재 커서 위치에 이미지 노드를 삽입합니다.
              const { state, dispatch } = view;
              const imageNode = state.schema.nodes.image.create({ src: base64Url });
              const transaction = state.tr.replaceSelectionWith(imageNode);
              dispatch(transaction);

              toast.success('캡처 이미지가 본문에 삽입되었습니다.', { id: 'paste-img' });
            } catch (error) {
              console.error('이미지 붙여넣기 실패:', error);
              toast.error('이미지 처리에 실패했습니다.', { id: 'paste-img' });
            }
          });
          return true; // 기본 붙여넣기 방지 및 핸들러 완료
        }
        return false;
      },
      // 설명: 드래그 앤 드롭으로 이미지를 떨어뜨렸을 때 감지하여 삽입합니다.
      handleDrop: (view, event) => {
        const images = extractImagesFromDrop(event);
        if (images.length > 0) {
          event.preventDefault();

          images.forEach(async (file) => {
            try {
              toast.loading('드롭된 이미지를 최적화하는 중...', { id: 'drop-img' });
              const base64Url = await compressImage(file, { maxWidth: 1200, quality: 0.85 });

              const { state, dispatch } = view;
              const imageNode = state.schema.nodes.image.create({ src: base64Url });
              const transaction = state.tr.replaceSelectionWith(imageNode);
              dispatch(transaction);

              toast.success('이미지가 본문에 삽입되었습니다.', { id: 'drop-img' });
            } catch (error) {
              console.error('이미지 드롭 실패:', error);
              toast.error('이미지 처리에 실패했습니다.', { id: 'drop-img' });
            }
          });
          return true;
        }
        return false;
      }
    }
  });

  // 설명: 외부에서 value prop이 완전히 변경되었을 때 (예: 모달 초기화 또는 작업 수정 시) 에디터 내용을 동기화합니다.
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      // 설명: 에디터가 비어있고 value도 비어있으면 불필요한 setContent를 방지합니다.
      if (!value && editor.isEmpty) return;
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  // 설명: 툴바의 사진 첨부 버튼 클릭 시 숨김 input 클릭
  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  // 설명: 파일 선택창에서 이미지를 골랐을 때 압축 및 에디터 삽입 처리
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        try {
          toast.loading('선택한 이미지를 최적화하는 중...', { id: 'upload-img' });
          const base64Url = await compressImage(file, { maxWidth: 1200, quality: 0.85 });

          editor?.chain().focus().setImage({ src: base64Url }).run();
          toast.success('이미지가 본문에 첨부되었습니다.', { id: 'upload-img' });
        } catch (error) {
          console.error('이미지 첨부 실패:', error);
          toast.error('이미지 첨부에 실패했습니다.', { id: 'upload-img' });
        }
      }
    }

    // 설명: 동일한 파일 재선택을 위해 value 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!editor) {
    return (
      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 text-xs text-slate-400 text-center animate-pulse">
        에디터를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 transition-all">
      {/* 설명: 상단 서식 제어 툴바 */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 bg-slate-50/90 border-b border-slate-200 text-slate-600">
        {/* 설명: 굵게(Bold) 버튼 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded-lg text-xs transition ${
            editor.isActive('bold') ? 'bg-sky-100 text-sky-700 font-bold shadow-xs' : 'hover:bg-slate-200/70 hover:text-slate-900'
          }`}
          title="굵게 (Ctrl+B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>

        {/* 설명: 기울임(Italic) 버튼 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded-lg text-xs transition ${
            editor.isActive('italic') ? 'bg-sky-100 text-sky-700 font-bold shadow-xs' : 'hover:bg-slate-200/70 hover:text-slate-900'
          }`}
          title="기울임 (Ctrl+I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>

        {/* 설명: 밑줄(Underline) 버튼 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded-lg text-xs transition ${
            editor.isActive('underline') ? 'bg-sky-100 text-sky-700 font-bold shadow-xs' : 'hover:bg-slate-200/70 hover:text-slate-900'
          }`}
          title="밑줄 (Ctrl+U)"
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </button>

        {/* 설명: 취소선(Strike) 버튼 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded-lg text-xs transition ${
            editor.isActive('strike') ? 'bg-sky-100 text-sky-700 font-bold shadow-xs' : 'hover:bg-slate-200/70 hover:text-slate-900'
          }`}
          title="취소선"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-slate-300 mx-1" />

        {/* 설명: 제목 1 (H1) 버튼 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1.5 rounded-lg text-xs transition ${
            editor.isActive('heading', { level: 1 }) ? 'bg-sky-100 text-sky-700 font-bold shadow-xs' : 'hover:bg-slate-200/70 hover:text-slate-900'
          }`}
          title="대제목 (Heading 1)"
        >
          <Heading1 className="h-3.5 w-3.5" />
        </button>

        {/* 설명: 제목 2 (H2) 버튼 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded-lg text-xs transition ${
            editor.isActive('heading', { level: 2 }) ? 'bg-sky-100 text-sky-700 font-bold shadow-xs' : 'hover:bg-slate-200/70 hover:text-slate-900'
          }`}
          title="중제목 (Heading 2)"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </button>

        {/* 설명: 제목 3 (H3) 버튼 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-1.5 rounded-lg text-xs transition ${
            editor.isActive('heading', { level: 3 }) ? 'bg-sky-100 text-sky-700 font-bold shadow-xs' : 'hover:bg-slate-200/70 hover:text-slate-900'
          }`}
          title="소제목 (Heading 3)"
        >
          <Heading3 className="h-3.5 w-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-slate-300 mx-1" />

        {/* 설명: 불릿 글머리 기호 목록 버튼 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded-lg text-xs transition ${
            editor.isActive('bulletList') ? 'bg-sky-100 text-sky-700 font-bold shadow-xs' : 'hover:bg-slate-200/70 hover:text-slate-900'
          }`}
          title="글머리 기호 목록"
        >
          <List className="h-3.5 w-3.5" />
        </button>

        {/* 설명: 번호 매기기 목록 버튼 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded-lg text-xs transition ${
            editor.isActive('orderedList') ? 'bg-sky-100 text-sky-700 font-bold shadow-xs' : 'hover:bg-slate-200/70 hover:text-slate-900'
          }`}
          title="번호 매기기 목록"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>

        {/* 설명: 인용구(Blockquote) 버튼 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded-lg text-xs transition ${
            editor.isActive('blockquote') ? 'bg-sky-100 text-sky-700 font-bold shadow-xs' : 'hover:bg-slate-200/70 hover:text-slate-900'
          }`}
          title="인용구"
        >
          <Quote className="h-3.5 w-3.5" />
        </button>

        {/* 설명: 인라인 코드 버튼 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-1.5 rounded-lg text-xs transition ${
            editor.isActive('code') ? 'bg-sky-100 text-sky-700 font-bold shadow-xs' : 'hover:bg-slate-200/70 hover:text-slate-900'
          }`}
          title="코드"
        >
          <Code className="h-3.5 w-3.5" />
        </button>

        {/* 설명: 구분선(Horizontal Rule) 버튼 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-1.5 rounded-lg text-xs hover:bg-slate-200/70 hover:text-slate-900 transition"
          title="구분선 삽입"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-slate-300 mx-1" />

        {/* 설명: 이미지 첨부 버튼 (파일 선택) */}
        <button
          type="button"
          onClick={handleUploadButtonClick}
          className="p-1.5 rounded-lg text-xs text-sky-600 hover:bg-sky-100 hover:text-sky-700 transition flex items-center gap-1 font-bold"
          title="이미지 파일 첨부 (또는 캡처 후 본문에 Ctrl+V)"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          <span className="text-[11px] hidden sm:inline">사진 첨부</span>
        </button>

        {/* 설명: 숨겨진 파일 첨부 인풋 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        {/* 설명: 서식 지우기 버튼 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          className="p-1.5 rounded-lg text-xs hover:bg-slate-200/70 hover:text-slate-900 transition"
          title="서식 지우기"
        >
          <RemoveFormatting className="h-3.5 w-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-slate-300 mx-1" />

        {/* 설명: 실행 취소(Undo) 버튼 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded-lg text-xs hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-30 transition"
          title="실행 취소 (Ctrl+Z)"
        >
          <Undo className="h-3.5 w-3.5" />
        </button>

        {/* 설명: 다시 실행(Redo) 버튼 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded-lg text-xs hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-30 transition"
          title="다시 실행 (Ctrl+Y)"
        >
          <Redo className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 설명: 실제 글을 작성하는 에디터 본문 영역 */}
      <div className="cursor-text bg-white">
        <EditorContent editor={editor} />
      </div>

      {/* 설명: 에디터 하단 힌트 바 */}
      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <span>💡 캡처화면(Win+Shift+S 등) 복사 후 <strong>Ctrl + V</strong>로 즉시 붙여넣을 수 있습니다.</span>
        <span>이미지 드래그&드롭 지원</span>
      </div>
    </div>
  );
};

export default RichTextEditor;
