import type { CommentResponse } from '@team-task-tracker/shared';

export interface CommentPermissions {
  canEdit: boolean;
  canDelete: boolean;
}

// UI affordance only: the backend stays authoritative and a 403 is still shown inline.
export function commentPermissions({
  userId,
  role,
  comment,
  archived,
}: {
  userId: string | undefined;
  role: 'OWNER' | 'MEMBER' | undefined;
  comment: Pick<CommentResponse, 'author'>;
  archived: boolean;
}): CommentPermissions {
  const isAuthor = userId !== undefined && comment.author.id === userId;
  return {
    canEdit: !archived && isAuthor,
    canDelete: !archived && (isAuthor || role === 'OWNER'),
  };
}
