import type {
  AddMemberRequest,
  CreateProjectRequest,
  MemberListResponse,
  MemberResponse,
  ProjectDetailResponse,
  ProjectListQuery,
  ProjectListResponse,
  ProjectResponse,
  ProjectRole,
  UpdateProjectRequest,
} from '@team-task-tracker/shared';
import { AppError } from '../errors.js';
import { Prisma, type PrismaClient } from '../generated/prisma/client.js';

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

  async listMembers(projectId: string): Promise<MemberListResponse> {
    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { email: true, name: true } } },
      orderBy: [{ createdAt: 'asc' }, { userId: 'asc' }],
    });
    return {
      data: members.map((m) => ({
        userId: m.userId,
        email: m.user.email,
        name: m.user.name,
        role: m.role,
      })),
    };
  }

  async addMember(projectId: string, input: AddMemberRequest): Promise<MemberResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'No registered user with that email');
    try {
      const member = await this.prisma.projectMember.create({
        data: { projectId, userId: user.id, role: input.role },
      });
      return { userId: user.id, email: user.email, name: user.name, role: member.role };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError(409, 'ALREADY_MEMBER', 'User is already a member of this project');
      }
      throw err;
    }
  }

  // The owner count and the delete run in one serializable transaction so two concurrent
  // removals cannot both pass the last-owner check.
  async removeMember(projectId: string, userId: string): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        const target = await tx.projectMember.findUnique({
          where: { projectId_userId: { projectId, userId } },
        });
        if (!target) throw new AppError(404, 'MEMBER_NOT_FOUND', 'Member not found');
        if (target.role === 'OWNER') {
          const owners = await tx.projectMember.count({ where: { projectId, role: 'OWNER' } });
          if (owners <= 1) {
            throw new AppError(409, 'LAST_OWNER', 'The last owner cannot be removed');
          }
        }
        await tx.projectMember.delete({ where: { projectId_userId: { projectId, userId } } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
