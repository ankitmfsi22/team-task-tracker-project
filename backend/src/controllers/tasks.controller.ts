import type { RequestHandler } from 'express';
import type { CreateTaskRequest, TaskParams } from '@team-task-tracker/shared';
import type { TasksService } from '../services/tasks.service.js';

export function createTasksController(
  service: TasksService,
): Record<'create' | 'get', RequestHandler> {
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
    get: async (req, res) => {
      const { projectId, taskId } = req.params as unknown as TaskParams;
      res.status(200).json(await service.get(projectId, taskId));
    },
  };
}
