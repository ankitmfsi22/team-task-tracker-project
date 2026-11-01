import type { RequestHandler } from 'express';
import { ActivityListQuerySchema, type ActivityParams } from '@team-task-tracker/shared';
import type { ActivityService } from '../services/activity.service.js';

export function createActivityController(service: ActivityService): Record<'list', RequestHandler> {
  return {
    list: async (req, res) => {
      // validate only checks req.query, so the typed query with defaults is parsed here.
      const query = ActivityListQuerySchema.parse(req.query);
      const { projectId, taskId } = req.params as unknown as ActivityParams;
      res.status(200).json(await service.list(projectId, taskId, query));
    },
  };
}
