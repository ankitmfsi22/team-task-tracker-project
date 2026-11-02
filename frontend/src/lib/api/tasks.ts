import {
  TaskListResponseSchema,
  TaskResponseSchema,
  type CreateTaskRequest,
  type TaskListResponse,
  type TaskResponse,
  type TaskStatus,
  type UpdateTaskRequest,
} from '@team-task-tracker/shared';
import { apiFetch } from './client';

const projectPath = (projectId: string) => `/api/v1/projects/${projectId}`;
const taskPath = (projectId: string, taskId: string) => `${projectPath(projectId)}/tasks/${taskId}`;

export function listTasks(
  projectId: string,
  query: Record<string, string>,
): Promise<TaskListResponse> {
  const search = new URLSearchParams(query).toString();
  return apiFetch(`${projectPath(projectId)}/tasks?${search}`, { schema: TaskListResponseSchema });
}

export function getTask(projectId: string, taskId: string): Promise<TaskResponse> {
  return apiFetch(taskPath(projectId, taskId), { schema: TaskResponseSchema });
}

export function createTask(projectId: string, body: CreateTaskRequest): Promise<TaskResponse> {
  return apiFetch(`${projectPath(projectId)}/tasks`, {
    method: 'POST',
    body,
    schema: TaskResponseSchema,
  });
}

export function updateTask(
  projectId: string,
  taskId: string,
  body: UpdateTaskRequest,
): Promise<TaskResponse> {
  return apiFetch(taskPath(projectId, taskId), {
    method: 'PATCH',
    body,
    schema: TaskResponseSchema,
  });
}

export function changeTaskStatus(
  projectId: string,
  taskId: string,
  status: TaskStatus,
): Promise<TaskResponse> {
  return apiFetch(`${taskPath(projectId, taskId)}/status`, {
    method: 'POST',
    body: { status },
    schema: TaskResponseSchema,
  });
}

export function assignTask(
  projectId: string,
  taskId: string,
  assigneeId: string | null,
): Promise<TaskResponse> {
  return apiFetch(`${taskPath(projectId, taskId)}/assignee`, {
    method: 'PUT',
    body: { assigneeId },
    schema: TaskResponseSchema,
  });
}

export function archiveTask(projectId: string, taskId: string): Promise<TaskResponse> {
  return apiFetch(`${taskPath(projectId, taskId)}/archive`, {
    method: 'POST',
    schema: TaskResponseSchema,
  });
}
