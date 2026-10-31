import type { CreateTaskRequest, TaskResponse } from '@team-task-tracker/shared';
import type { PrismaClient } from '../db.js';
import { AppError } from '../errors.js';
import type { Task } from '../generated/prisma/client.js';

export function toTaskResponse(task: Task): TaskResponse {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate?.toISOString() ?? null,
    assigneeId: task.assigneeId,
    createdById: task.createdById,
    archivedAt: task.archivedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export class TasksService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(projectId: string, userId: string, input: CreateTaskRequest): Promise<TaskResponse> {
    const dueDate =
      input.dueDate === undefined ? undefined : this.parseFutureDueDate(input.dueDate);
    if (input.assigneeId !== undefined) await this.assertMember(projectId, input.assigneeId);
    const task = await this.prisma.task.create({
      data: {
        projectId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        dueDate,
        assigneeId: input.assigneeId,
        createdById: userId,
      },
    });
    return toTaskResponse(task);
  }

  async get(projectId: string, taskId: string): Promise<TaskResponse> {
    return toTaskResponse(await this.find(projectId, taskId));
  }

  // A task of another project is reported as missing so ids never leak across projects.
  private async find(projectId: string, taskId: string): Promise<Task> {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, projectId } });
    if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
    return task;
  }

  private async assertMember(projectId: string, userId: string): Promise<void> {
    const member = await this.prisma.projectMember.findFirst({ where: { projectId, userId } });
    if (!member) {
      throw new AppError(400, 'ASSIGNEE_NOT_MEMBER', 'Assignee is not a member of the project');
    }
  }

  private parseFutureDueDate(value: string): Date {
    const date = new Date(value);
    if (date.getTime() < Date.now()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'dueDate must not be in the past');
    }
    return date;
  }
}
