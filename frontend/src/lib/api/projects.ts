import {
  ProjectListResponseSchema,
  ProjectResponseSchema,
  type CreateProjectRequest,
  type ProjectListResponse,
  type ProjectResponse,
} from '@team-task-tracker/shared';
import { apiFetch } from './client';

export interface ProjectListParams {
  page: number;
  pageSize: number;
  includeArchived: boolean;
}

export const projectKeys = {
  all: ['projects'] as const,
  list: (params: ProjectListParams) => ['projects', params] as const,
};

export function listProjects(params: ProjectListParams): Promise<ProjectListResponse> {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    includeArchived: String(params.includeArchived),
  });
  return apiFetch(`/api/v1/projects?${query.toString()}`, { schema: ProjectListResponseSchema });
}

export function createProject(body: CreateProjectRequest): Promise<ProjectResponse> {
  return apiFetch('/api/v1/projects', { schema: ProjectResponseSchema, method: 'POST', body });
}
