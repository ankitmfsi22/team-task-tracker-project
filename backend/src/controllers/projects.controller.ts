import type { RequestHandler } from 'express';
import {
  ProjectListQuerySchema,
  type CreateProjectRequest,
  type ProjectRole,
  type UpdateProjectRequest,
} from '@team-task-tracker/shared';
import type { ProjectsService } from '../services/projects.service.js';

export function createProjectsController(
  service: ProjectsService,
): Record<'create' | 'list' | 'get' | 'update' | 'archive', RequestHandler> {
  return {
    create: async (req, res) => {
      const project = await service.create(
        res.locals['userId'] as string,
        req.body as CreateProjectRequest,
      );
      res.status(201).json(project);
    },
    list: async (req, res) => {
      const query = ProjectListQuerySchema.parse(req.query);
      res.status(200).json(await service.list(res.locals['userId'] as string, query));
    },
    get: async (req, res) => {
      const role = (res.locals['membership'] as { role: ProjectRole }).role;
      res.status(200).json(await service.get(req.params['projectId'] as string, role));
    },
    update: async (req, res) => {
      const project = await service.update(
        req.params['projectId'] as string,
        req.body as UpdateProjectRequest,
      );
      res.status(200).json(project);
    },
    archive: async (req, res) => {
      res.status(200).json(await service.archive(req.params['projectId'] as string));
    },
  };
}
