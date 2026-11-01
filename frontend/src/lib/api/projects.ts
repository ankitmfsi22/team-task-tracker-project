import {
  MemberListResponseSchema,
  MemberResponseSchema,
  ProjectDetailResponseSchema,
  ProjectListResponseSchema,
  ProjectResponseSchema,
  type AddMemberRequest,
  type CreateProjectRequest,
  type MemberListResponse,
  type MemberResponse,
  type ProjectDetailResponse,
  type ProjectListResponse,
  type ProjectResponse,
  type UpdateProjectRequest,
} from '@team-task-tracker/shared';
import { z } from 'zod';
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

export const projectDetailKeys = {
  detail: (id: string) => ['project', id] as const,
  members: (id: string) => ['project', id, 'members'] as const,
};

export function getProject(id: string): Promise<ProjectDetailResponse> {
  return apiFetch(`/api/v1/projects/${id}`, { schema: ProjectDetailResponseSchema });
}

export function updateProject(id: string, body: UpdateProjectRequest): Promise<ProjectResponse> {
  return apiFetch(`/api/v1/projects/${id}`, {
    schema: ProjectResponseSchema,
    method: 'PATCH',
    body,
  });
}

export function archiveProject(id: string): Promise<ProjectResponse> {
  return apiFetch(`/api/v1/projects/${id}/archive`, {
    schema: ProjectResponseSchema,
    method: 'POST',
  });
}

export function listMembers(id: string): Promise<MemberListResponse> {
  return apiFetch(`/api/v1/projects/${id}/members`, { schema: MemberListResponseSchema });
}

export function addMember(id: string, body: AddMemberRequest): Promise<MemberResponse> {
  return apiFetch(`/api/v1/projects/${id}/members`, {
    schema: MemberResponseSchema,
    method: 'POST',
    body,
  });
}

export function removeMember(id: string, userId: string): Promise<undefined> {
  return apiFetch(`/api/v1/projects/${id}/members/${userId}`, {
    schema: z.undefined(),
    method: 'DELETE',
  });
}
