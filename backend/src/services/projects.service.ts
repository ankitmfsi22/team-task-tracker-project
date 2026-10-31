import type {
  CreateProjectRequest,
  ProjectDetailResponse,
  ProjectListQuery,
  ProjectListResponse,
  ProjectResponse,
  ProjectRole,
  UpdateProjectRequest,
} from '@team-task-tracker/shared';
import { AppError } from '../errors.js';
import type { PrismaClient } from '../generated/prisma/client.js';

const toProject = (project: {
  id: string;
  name: string;
  description: string | null;
  archivedAt: Date | null;
  createdAt: Date;
}): ProjectResponse => ({
  id: project.id,
  name: project.name,
  description: project.description,
  archivedAt: project.archivedAt?.toISOString() ?? null,
  createdAt: project.createdAt.toISOString(),
});

export class ProjectsService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(userId: string, input: CreateProjectRequest): Promise<ProjectResponse> {
    const project = await this.prisma.project.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        members: { create: { userId, role: 'OWNER' } },
      },
    });
    return toProject(project);
  }

  async list(userId: string, query: ProjectListQuery): Promise<ProjectListResponse> {
    const where = {
      members: { some: { userId } },
      ...(query.includeArchived ? {} : { archivedAt: null }),
    };
    const [total, projects] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      data: projects.map(toProject),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  // Membership was already checked by projectAccess.
  async get(projectId: string, role: ProjectRole): Promise<ProjectDetailResponse> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');
    return { ...toProject(project), role };
  }

  async update(projectId: string, input: UpdateProjectRequest): Promise<ProjectResponse> {
    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
      },
    });
    return toProject(project);
  }

  // projectAccess (write: true) already rejected an already archived project with 409.
  async archive(projectId: string): Promise<ProjectResponse> {
    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: { archivedAt: new Date() },
    });
    return toProject(project);
  }
}
