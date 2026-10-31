import { describe, expect, it } from 'vitest';
import {
  AddMemberRequestSchema,
  CreateProjectRequestSchema,
  MemberListResponseSchema,
  MemberParamsSchema,
  MemberResponseSchema,
  ProjectDetailResponseSchema,
  ProjectIdParamsSchema,
  ProjectListQuerySchema,
  ProjectListResponseSchema,
  ProjectResponseSchema,
  ProjectRoleSchema,
  UpdateProjectRequestSchema,
} from './index.js';

const uuid = '123e4567-e89b-42d3-a456-426614174000';
const uuid2 = '223e4567-e89b-42d3-a456-426614174001';
const project = {
  id: uuid,
  name: 'Alpha',
  description: null,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};
const member = { userId: uuid, email: 'a@example.com', name: 'Ada', role: 'OWNER' };

describe('ProjectRoleSchema', () => {
  it('Contracts reject invalid input: only OWNER and MEMBER', () => {
    expect(ProjectRoleSchema.safeParse('OWNER').success).toBe(true);
    expect(ProjectRoleSchema.safeParse('MEMBER').success).toBe(true);
    expect(ProjectRoleSchema.safeParse('ADMIN').success).toBe(false);
  });
});

describe('CreateProjectRequestSchema', () => {
  it('Contracts reject invalid input: trims name and description', () => {
    expect(CreateProjectRequestSchema.parse({ name: '  Alpha ', description: ' d ' })).toEqual({
      name: 'Alpha',
      description: 'd',
    });
  });

  it('Contracts reject invalid input: empty, blank or over-long name', () => {
    expect(CreateProjectRequestSchema.safeParse({ name: '' }).success).toBe(false);
    expect(CreateProjectRequestSchema.safeParse({ name: '   ' }).success).toBe(false);
    expect(CreateProjectRequestSchema.safeParse({ name: 'x'.repeat(101) }).success).toBe(false);
    expect(CreateProjectRequestSchema.safeParse({}).success).toBe(false);
  });

  it('Contracts reject invalid input: description over 2000 characters', () => {
    expect(
      CreateProjectRequestSchema.safeParse({ name: 'A', description: 'x'.repeat(2001) }).success,
    ).toBe(false);
  });
});

describe('UpdateProjectRequestSchema', () => {
  it('Contracts reject invalid input: empty object fails', () => {
    expect(UpdateProjectRequestSchema.safeParse({}).success).toBe(false);
  });

  it('Contracts reject invalid input: accepts one field, description may be null', () => {
    expect(UpdateProjectRequestSchema.safeParse({ name: 'New' }).success).toBe(true);
    expect(UpdateProjectRequestSchema.safeParse({ description: null }).success).toBe(true);
    expect(UpdateProjectRequestSchema.safeParse({ name: '' }).success).toBe(false);
  });
});

describe('ProjectResponseSchema and ProjectDetailResponseSchema', () => {
  it('Contracts reject invalid input: project response requires uuid id', () => {
    expect(ProjectResponseSchema.safeParse(project).success).toBe(true);
    expect(ProjectResponseSchema.safeParse({ ...project, id: 'nope' }).success).toBe(false);
  });

  it('Contracts reject invalid input: detail requires a valid role', () => {
    expect(ProjectDetailResponseSchema.safeParse({ ...project, role: 'MEMBER' }).success).toBe(
      true,
    );
    expect(ProjectDetailResponseSchema.safeParse({ ...project, role: 'ADMIN' }).success).toBe(
      false,
    );
    expect(ProjectDetailResponseSchema.safeParse(project).success).toBe(false);
  });
});

describe('ProjectListQuerySchema', () => {
  it('Contracts reject invalid input: includeArchived accepts true/false strings, default false', () => {
    expect(ProjectListQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
      includeArchived: false,
    });
    expect(ProjectListQuerySchema.parse({ includeArchived: 'true' }).includeArchived).toBe(true);
    expect(ProjectListQuerySchema.parse({ includeArchived: 'false' }).includeArchived).toBe(false);
  });

  it('Contracts reject invalid input: includeArchived other values and bad pagination', () => {
    expect(ProjectListQuerySchema.safeParse({ includeArchived: 'yes' }).success).toBe(false);
    expect(ProjectListQuerySchema.safeParse({ includeArchived: '1' }).success).toBe(false);
    expect(ProjectListQuerySchema.safeParse({ pageSize: '101' }).success).toBe(false);
  });
});

describe('ProjectListResponseSchema', () => {
  it('Contracts reject invalid input: requires data and meta', () => {
    const meta = { page: 1, pageSize: 20, total: 1, totalPages: 1 };
    expect(ProjectListResponseSchema.safeParse({ data: [project], meta }).success).toBe(true);
    expect(ProjectListResponseSchema.safeParse({ data: [project] }).success).toBe(false);
  });
});

describe('params schemas', () => {
  it('Contracts reject invalid input: ProjectIdParams requires uuid', () => {
    expect(ProjectIdParamsSchema.safeParse({ projectId: uuid }).success).toBe(true);
    expect(ProjectIdParamsSchema.safeParse({ projectId: '123' }).success).toBe(false);
  });

  it('Contracts reject invalid input: MemberParams requires both uuids', () => {
    expect(MemberParamsSchema.safeParse({ projectId: uuid, userId: uuid2 }).success).toBe(true);
    expect(MemberParamsSchema.safeParse({ projectId: uuid, userId: 'x' }).success).toBe(false);
    expect(MemberParamsSchema.safeParse({ projectId: uuid }).success).toBe(false);
  });
});

describe('AddMemberRequestSchema', () => {
  it('Contracts reject invalid input: trims and lowercases email, role defaults to MEMBER', () => {
    expect(AddMemberRequestSchema.parse({ email: '  User@Example.COM ' })).toEqual({
      email: 'user@example.com',
      role: 'MEMBER',
    });
    expect(AddMemberRequestSchema.parse({ email: 'a@b.co', role: 'OWNER' }).role).toBe('OWNER');
  });

  it('Contracts reject invalid input: invalid email or role', () => {
    expect(AddMemberRequestSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
    expect(AddMemberRequestSchema.safeParse({}).success).toBe(false);
    expect(AddMemberRequestSchema.safeParse({ email: 'a@b.co', role: 'ADMIN' }).success).toBe(
      false,
    );
  });
});

describe('member responses', () => {
  it('Contracts reject invalid input: MemberResponse requires uuid userId and role', () => {
    expect(MemberResponseSchema.safeParse(member).success).toBe(true);
    expect(MemberResponseSchema.safeParse({ ...member, userId: 'x' }).success).toBe(false);
    expect(MemberResponseSchema.safeParse({ ...member, role: 'ADMIN' }).success).toBe(false);
  });

  it('Contracts reject invalid input: MemberListResponse wraps data array', () => {
    expect(MemberListResponseSchema.safeParse({ data: [member] }).success).toBe(true);
    expect(MemberListResponseSchema.safeParse({ data: [{ ...member, role: 'X' }] }).success).toBe(
      false,
    );
  });
});
