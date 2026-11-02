import { ActivityListResponseSchema, type ActivityListResponse } from '@team-task-tracker/shared';
import { apiFetch } from './client';

export function listActivity(
  projectId: string,
  taskId: string,
  query: { page: number; pageSize: number },
): Promise<ActivityListResponse> {
  const search = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  }).toString();
  return apiFetch(`/api/v1/projects/${projectId}/tasks/${taskId}/activity?${search}`, {
    schema: ActivityListResponseSchema,
  });
}
