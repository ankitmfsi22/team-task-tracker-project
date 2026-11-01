import type { RequestHandler } from 'express';
import type { ProjectRole } from '@team-task-tracker/shared';
import type { PrismaClient } from '../db.js';
import { AppError } from '../errors.js';

interface ProjectAccessOptions {
  // Roles allowed to pass; any member passes when omitted.
  roles?: ProjectRole[];
  // Reject the request with 409 when the project is archived (use on mutating routes).
  write?: boolean;
}

// Runs after `authenticate` and `validate({ params: ProjectIdParamsSchema })`.
// Order: 404 (no project or not a member), 403 (role not allowed), 409 (write to archived project).
// On success sets res.locals.project ({ id, archivedAt }) and res.locals.membership ({ role }).
export function projectAccess(
  prisma: PrismaClient,
  options: ProjectAccessOptions = {},
): RequestHandler {
  return async (req, res, next) => {
    const userId = res.locals['userId'] as string;
    const project = await prisma.project.findUnique({
      where: { id: req.params['projectId'] as string },
      select: {
        id: true,
        archivedAt: true,
        members: { where: { userId }, select: { role: true } },
      },
    });
    const membership = project?.members[0];
    if (!project || !membership) {
      next(new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found'));
      return;
    }
    if (options.roles && !options.roles.includes(membership.role)) {
      next(new AppError(403, 'FORBIDDEN', 'Insufficient role for this action'));
      return;
    }
    if (options.write && project.archivedAt !== null) {
      next(new AppError(409, 'PROJECT_ARCHIVED', 'Project is archived and read-only'));
      return;
    }
    res.locals['project'] = { id: project.id, archivedAt: project.archivedAt };
    res.locals['membership'] = { role: membership.role };
    next();
  };
}
