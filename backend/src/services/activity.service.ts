import type {
  ActivityListQuery,
  ActivityListResponse,
  ActivityResponse,
} from '@team-task-tracker/shared';
import type { PrismaClient } from '../db.js';
import { AppError } from '../errors.js';
import type { Prisma } from '../generated/prisma/client.js';

const withActor = { actor: { select: { id: true, name: true } } } as const;
type ActivityWithActor = Prisma.ActivityGetPayload<{ include: typeof withActor }>;

// metadata is stored as JSON and only written by TasksService in the shape ActivityMetadataSchemas defines.
export function toActivityResponse(entry: ActivityWithActor): ActivityResponse {
  return {
    id: entry.id,
    taskId: entry.taskId,
    action: entry.action,
    metadata: entry.metadata,
    actor: entry.actor,
    createdAt: entry.createdAt.toISOString(),
  } as ActivityResponse;
}

// Read-only on purpose: activity is append-only, so there is no update or delete method.
export class ActivityService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(
    projectId: string,
    taskId: string,
    query: ActivityListQuery,
  ): Promise<ActivityListResponse> {
    // A task of another project is reported as missing so ids never leak across projects.
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId },
      select: { id: true },
    });
    if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
    const where = { taskId };
    const [entries, total] = await this.prisma.$transaction([
      this.prisma.activity.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: withActor,
      }),
      this.prisma.activity.count({ where }),
    ]);
    return {
      data: entries.map(toActivityResponse),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }
}
