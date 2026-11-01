import type {
  CommentListQuery,
  CommentListResponse,
  CommentResponse,
  ProjectRole,
} from '@team-task-tracker/shared';
import type { PrismaClient } from '../db.js';
import { AppError } from '../errors.js';
import type { Comment, Prisma } from '../generated/prisma/client.js';

const withAuthor = { author: { select: { id: true, name: true } } } as const;
type CommentWithAuthor = Prisma.CommentGetPayload<{ include: typeof withAuthor }>;

export function toCommentResponse(comment: CommentWithAuthor): CommentResponse {
  return {
    id: comment.id,
    taskId: comment.taskId,
    body: comment.body,
    author: comment.author,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

export class CommentsService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    projectId: string,
    taskId: string,
    userId: string,
    body: string,
  ): Promise<CommentResponse> {
    await this.assertTaskWritable(projectId, taskId);
    const comment = await this.prisma.comment.create({
      data: { taskId, authorId: userId, body },
      include: withAuthor,
    });
    return toCommentResponse(comment);
  }

  async list(
    projectId: string,
    taskId: string,
    query: CommentListQuery,
  ): Promise<CommentListResponse> {
    await this.findTask(projectId, taskId);
    const where = { taskId };
    const [comments, total] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: withAuthor,
      }),
      this.prisma.comment.count({ where }),
    ]);
    return {
      data: comments.map(toCommentResponse),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  // Only the author may edit, even a project OWNER (FRS section 5).
  async update(
    projectId: string,
    taskId: string,
    commentId: string,
    userId: string,
    body: string,
  ): Promise<CommentResponse> {
    const comment = await this.findComment(projectId, taskId, commentId);
    if (comment.authorId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Only the author can edit this comment');
    }
    await this.assertTaskWritable(projectId, taskId);
    const updated = await this.prisma.comment.update({
      where: { id: comment.id },
      data: { body },
      include: withAuthor,
    });
    return toCommentResponse(updated);
  }

  // The author, or a project OWNER for any comment, may delete.
  async remove(
    projectId: string,
    taskId: string,
    commentId: string,
    userId: string,
    role: ProjectRole,
  ): Promise<void> {
    const comment = await this.findComment(projectId, taskId, commentId);
    if (comment.authorId !== userId && role !== 'OWNER') {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Only the author or a project owner can delete this comment',
      );
    }
    await this.assertTaskWritable(projectId, taskId);
    await this.prisma.comment.delete({ where: { id: comment.id } });
  }

  // A task of another project is reported as missing so ids never leak across projects.
  private async findTask(projectId: string, taskId: string): Promise<{ archivedAt: Date | null }> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId },
      select: { archivedAt: true },
    });
    if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
    return task;
  }

  private async assertTaskWritable(projectId: string, taskId: string): Promise<void> {
    const task = await this.findTask(projectId, taskId);
    if (task.archivedAt !== null) throw new AppError(409, 'TASK_ARCHIVED', 'Task is archived');
  }

  private async findComment(
    projectId: string,
    taskId: string,
    commentId: string,
  ): Promise<Comment> {
    await this.findTask(projectId, taskId);
    const comment = await this.prisma.comment.findFirst({ where: { id: commentId, taskId } });
    if (!comment) throw new AppError(404, 'COMMENT_NOT_FOUND', 'Comment not found');
    return comment;
  }
}
