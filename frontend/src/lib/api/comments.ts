import {
  CommentListResponseSchema,
  CommentResponseSchema,
  type CommentListResponse,
  type CommentResponse,
  type CreateCommentRequest,
} from '@team-task-tracker/shared';
import { apiFetch } from './client';

const commentsPath = (projectId: string, taskId: string) =>
  `/api/v1/projects/${projectId}/tasks/${taskId}/comments`;

export function listComments(
  projectId: string,
  taskId: string,
  query: { page: number; pageSize: number },
): Promise<CommentListResponse> {
  const search = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  }).toString();
  return apiFetch(`${commentsPath(projectId, taskId)}?${search}`, {
    schema: CommentListResponseSchema,
  });
}

export function createComment(
  projectId: string,
  taskId: string,
  body: CreateCommentRequest,
): Promise<CommentResponse> {
  return apiFetch(commentsPath(projectId, taskId), {
    method: 'POST',
    body,
    schema: CommentResponseSchema,
  });
}
