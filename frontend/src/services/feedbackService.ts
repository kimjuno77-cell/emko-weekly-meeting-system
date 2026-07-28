import { supabase } from '@/lib/supabase';
import { Attachment, Comment } from '@/types';

// ==============================
// 첨부파일 (Attachments) API
// ==============================

export const getAttachments = async (entityType: string, entityId: string): Promise<Attachment[]> => {
  const { data, error } = await supabase
    .from('attachments')
    .select(`*, uploader:user_profiles!attachments_uploaded_by_fkey(*)`)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching attachments:', error);
    throw error;
  }
  return data || [];
};

export const uploadAttachment = async (
  file: File,
  entityType: string,
  entityId: string,
  userId: string
): Promise<Attachment> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
  const filePath = `${entityType}/${entityId}/${fileName}`;

  // 1. Storage에 파일 업로드
  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    throw new Error('파일 업로드에 실패했습니다.');
  }

  // 2. 파일 URL 가져오기
  const { data: publicUrlData } = supabase.storage
    .from('attachments')
    .getPublicUrl(filePath);

  // 3. DB에 기록 저장
  const { data, error: dbError } = await supabase
    .from('attachments')
    .insert({
      file_name: file.name,
      file_url: publicUrlData.publicUrl,
      file_size: file.size,
      content_type: file.type,
      entity_type: entityType,
      entity_id: entityId,
      uploaded_by: userId
    })
    .select(`*, uploader:user_profiles!attachments_uploaded_by_fkey(*)`)
    .single();

  if (dbError) {
    console.error('DB insert error:', dbError);
    throw new Error('파일 정보를 저장하는데 실패했습니다.');
  }

  return data;
};

export const deleteAttachment = async (attachmentId: string, fileUrl: string): Promise<void> => {
  try {
    // 1. Storage에서 삭제 (URL에서 파일 경로 추출)
    const urlParts = fileUrl.split('/attachments/');
    if (urlParts.length > 1) {
      const filePath = urlParts[1];
      await supabase.storage.from('attachments').remove([filePath]);
    }

    // 2. DB에서 삭제
    const { error } = await supabase.from('attachments').delete().eq('id', attachmentId);
    if (error) throw error;
  } catch (error) {
    console.error('Delete attachment error:', error);
    throw new Error('파일 삭제에 실패했습니다.');
  }
};

// ==============================
// 댓글 (Comments) API
// ==============================

export const getComments = async (entityType: string, entityId: string): Promise<Comment[]> => {
  const { data, error } = await supabase
    .from('comments')
    .select(`*, author:user_profiles!comments_author_id_fkey(*)`)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
  return data || [];
};

export const addComment = async (
  content: string,
  entityType: string,
  entityId: string,
  userId: string
): Promise<Comment> => {
  const { data, error } = await supabase
    .from('comments')
    .insert({
      content,
      entity_type: entityType,
      entity_id: entityId,
      author_id: userId
    })
    .select(`*, author:user_profiles!comments_author_id_fkey(*)`)
    .single();

  if (error) {
    console.error('Add comment error:', error);
    throw new Error('댓글 작성에 실패했습니다.');
  }
  return data;
};

export const deleteComment = async (commentId: string): Promise<void> => {
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) {
    console.error('Delete comment error:', error);
    throw new Error('댓글 삭제에 실패했습니다.');
  }
};
