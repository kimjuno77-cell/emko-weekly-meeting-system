import React, { useState, useEffect, useRef } from 'react';
import { Attachment, Comment } from '@/types';
import { 
  getComments, 
  addComment, 
  deleteComment, 
  getAttachments, 
  uploadAttachment, 
  deleteAttachment 
} from '@/services/feedbackService';
import toast from 'react-hot-toast';
import { Paperclip, Send, Trash2, FileText, Download, X, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TaskFeedbackProps {
  taskId: string;
  currentUserId: string;
}

const TaskFeedback: React.FC<TaskFeedbackProps> = ({ taskId, currentUserId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFeedback();
  }, [taskId]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const [fetchedComments, fetchedAttachments] = await Promise.all([
        getComments('task', taskId),
        getAttachments('task', taskId)
      ]);
      setComments(fetchedComments);
      setAttachments(fetchedAttachments);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const added = await addComment(newComment, 'task', taskId, currentUserId);
      setComments([...comments, added]);
      setNewComment('');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      await deleteComment(commentId);
      setComments(comments.filter(c => c.id !== commentId));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 50MB 제한
    if (file.size > 50 * 1024 * 1024) {
      toast.error('파일 크기는 50MB를 초과할 수 없습니다.');
      return;
    }

    try {
      setUploading(true);
      const added = await uploadAttachment(file, 'task', taskId, currentUserId);
      setAttachments([...attachments, added]);
      toast.success('파일이 업로드되었습니다.');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachment: Attachment) => {
    if (!window.confirm('첨부파일을 삭제하시겠습니까?')) return;
    try {
      await deleteAttachment(attachment.id, attachment.file_url);
      setAttachments(attachments.filter(a => a.id !== attachment.id));
      toast.success('파일이 삭제되었습니다.');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-slate-400 text-sm">피드백 데이터를 불러오는 중...</div>;
  }

  return (
    <div className="bg-slate-50 border-t border-slate-200 p-4">
      
      {/* 첨부파일 영역 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-slate-600 uppercase">첨부파일 ({attachments.length})</h4>
          <div>
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center space-x-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
              <span>{uploading ? '업로드 중...' : '파일 첨부'}</span>
            </button>
          </div>
        </div>
        
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map(att => (
              <div key={att.id} className="flex items-center bg-white border border-slate-200 rounded-lg p-2 pr-3 shadow-sm group">
                <div className="w-8 h-8 bg-indigo-50 text-indigo-500 rounded-md flex items-center justify-center mr-2">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 mr-3">
                  <a 
                    href={att.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-slate-700 hover:text-indigo-600 truncate block max-w-[150px]"
                    title={att.file_name}
                  >
                    {att.file_name}
                  </a>
                  <p className="text-[10px] text-slate-400">
                    {att.file_size ? (att.file_size / 1024 / 1024).toFixed(2) + ' MB' : '알 수 없음'} • {att.uploader?.full_name || '알 수 없음'}
                  </p>
                </div>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a 
                    href={att.file_url}
                    download
                    className="p-1 text-slate-400 hover:text-sky-600 hover:bg-slate-100 rounded"
                    title="다운로드"
                  >
                    <Download className="w-3 h-3" />
                  </a>
                  {(att.uploaded_by === currentUserId) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAttachment(att)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded"
                      title="삭제"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 댓글 영역 */}
      <div>
        <h4 className="text-xs font-bold text-slate-600 uppercase mb-3">댓글 ({comments.length})</h4>
        
        <div className="space-y-3 mb-3 max-h-60 overflow-y-auto pr-2">
          {comments.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-2">아직 작성된 댓글이 없습니다.</p>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="flex space-x-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-600">
                  {comment.author?.full_name?.[0] || 'U'}
                </div>
                <div className="flex-1 bg-white rounded-lg p-3 shadow-sm border border-slate-100">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="text-xs font-bold text-slate-700">{comment.author?.full_name || '알 수 없음'}</span>
                      <span className="text-[10px] text-slate-400 ml-2">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ko })}
                      </span>
                    </div>
                    {comment.author_id === currentUserId && (
                      <button 
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-slate-300 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 댓글 입력 폼 */}
        <form onSubmit={handleAddComment} className="relative">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="댓글을 입력하세요... (Shift+Enter로 줄바꿈)"
            className="w-full pl-3 pr-12 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[40px] max-h-32"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAddComment(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!newComment.trim()}
            className="absolute right-2 top-2 p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md disabled:opacity-50 disabled:hover:bg-indigo-50 transition"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

    </div>
  );
};

export default TaskFeedback;
