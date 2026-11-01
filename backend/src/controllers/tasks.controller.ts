import type { RequestHandler } from 'express';
import {
  TaskListQuerySchema,
  type AssignTaskRequest,
  type ChangeTaskStatusRequest,
  type CreateTaskRequest,
  type TaskParams,
  type UpdateTaskRequest,
} from '@team-task-tracker/shared';
import type { TasksService } from '../services/tasks.service.js';

export function createTasksController(
  service: TasksService,
): Record<
  'create' | 'list' | 'get' | 'update' | 'assign' | 'changeStatus' | 'archive',
  RequestHandler
> {
  return {
    create: async (req, res) => {
      const projectId = req.params['projectId'] as string;
      const task = await service.create(
        projectId,
        res.locals['userId'] as string,
        req.body as CreateTaskRequest,
      );
      res.status(201).json(task);
    },
    list: async (req, res) => {
      // validate only checks req.query, so the typed query with defaults is parsed here.
      const query = TaskListQuerySchema.parse(req.query);
      res.status(200).json(await service.list(req.params['projectId'] as string, query));
    },
    update: async (req, res) => {
      const { projectId, taskId } = req.params as unknown as TaskParams;
      res.status(200).json(await service.update(projectId, taskId, req.body as UpdateTaskRequest));
    },
    assign: async (req, res) => {
      const { projectId, taskId } = req.params as unknown as TaskParams;
      const { assigneeId } = req.body as AssignTaskRequest;
      res.status(200).json(await service.assign(projectId, taskId, assigneeId));
    },
    changeStatus: async (req, res) => {
      const { projectId, taskId } = req.params as unknown as TaskParams;
      const { status } = req.body as ChangeTaskStatusRequest;
      res.status(200).json(await service.changeStatus(projectId, taskId, status));
    },
    archive: async (req, res) => {
      const { projectId, taskId } = req.params as unknown as TaskParams;
      res.status(200).json(await service.archive(projectId, taskId));
    },
    get: async (req, res) => {
      const { projectId, taskId } = req.params as unknown as TaskParams;
      res.status(200).json(await service.get(projectId, taskId));
    },
  };
}
