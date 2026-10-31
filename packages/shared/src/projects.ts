import { z } from 'zod';
import { PaginationMetaSchema, PaginationQuerySchema } from './common.js';

export const ProjectRoleSchema = z.enum(['OWNER', 'MEMBER']);

const ProjectNameSchema = z.string().trim().min(1).max(100);
const ProjectDescriptionSchema = z.string().trim().max(2000);

export const CreateProjectRequestSchema = z.object({
  name: ProjectNameSchema,
  description: ProjectDescriptionSchema.optional(),
});

export const UpdateProjectRequestSchema = z
  .object({
    name: ProjectNameSchema.optional(),
    description: ProjectDescriptionSchema.nullable().optional(),
  })
  .refine((body) => body.name !== undefined || body.description !== undefined, {
    message: 'At least one of name or description is required',
  });

export const ProjectResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const ProjectDetailResponseSchema = ProjectResponseSchema.extend({
  role: ProjectRoleSchema,
});

export const ProjectListQuerySchema = PaginationQuerySchema.extend({
  includeArchived: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export const ProjectListResponseSchema = z.object({
  data: z.array(ProjectResponseSchema),
  meta: PaginationMetaSchema,
});

export const ProjectIdParamsSchema = z.object({ projectId: z.uuid() });

export const MemberParamsSchema = z.object({ projectId: z.uuid(), userId: z.uuid() });

export const AddMemberRequestSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  role: ProjectRoleSchema.default('MEMBER'),
});

export const MemberResponseSchema = z.object({
  userId: z.uuid(),
  email: z.string(),
  name: z.string(),
  role: ProjectRoleSchema,
});

export const MemberListResponseSchema = z.object({ data: z.array(MemberResponseSchema) });

export type ProjectRole = z.infer<typeof ProjectRoleSchema>;
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;
export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;
export type ProjectDetailResponse = z.infer<typeof ProjectDetailResponseSchema>;
export type ProjectListQuery = z.infer<typeof ProjectListQuerySchema>;
export type ProjectListResponse = z.infer<typeof ProjectListResponseSchema>;
export type ProjectIdParams = z.infer<typeof ProjectIdParamsSchema>;
export type MemberParams = z.infer<typeof MemberParamsSchema>;
export type AddMemberRequest = z.infer<typeof AddMemberRequestSchema>;
export type MemberResponse = z.infer<typeof MemberResponseSchema>;
export type MemberListResponse = z.infer<typeof MemberListResponseSchema>;
