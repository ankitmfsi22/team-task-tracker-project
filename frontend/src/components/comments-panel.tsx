import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateCommentRequestSchema,
  UpdateCommentRequestSchema,
  type CommentResponse,
} from '@team-task-tracker/shared';
import { useState, type FormEvent } from 'react';
import { fieldErrorsFrom, type FieldErrors } from '@/components/form-field';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api/client';
import { createComment, deleteComment, listComments, updateComment } from '@/lib/api/comments';
import { useAuth } from '@/lib/auth/auth-context';
import { commentPermissions } from '@/lib/comment-permissions';
import { formatTimestamp } from '@/lib/humanize';

const PAGE_SIZE = 20;

function describeAddError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'You do not have permission';
    if (error.status === 409) return 'This task is archived and cannot be commented on.';
    if (error.status === 404) return 'Not found';
  }
  return 'Something went wrong';
}

function describeChangeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'You do not have permission';
    if (error.status === 409) return 'This task is archived and its comments are read-only.';
    if (error.status === 404) return 'Not found';
  }
  return 'Something went wrong';
}

function CommentItem({
  projectId,
  taskId,
  comment,
  canEdit,
  canDelete,
  onDeleted,
}: {
  projectId: string;
  taskId: string;
  comment: CommentResponse;
  canEdit: boolean;
  canDelete: boolean;
  onDeleted: () => void;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.body);
  const [fieldError, setFieldError] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const editId = `edit-comment-${comment.id}`;

  const updateMutation = useMutation({
    mutationFn: (body: string) => updateComment(projectId, taskId, comment.id, { body }),
    onSuccess: async () => {
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: ['comments', projectId, taskId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteComment(projectId, taskId, comment.id),
    onSettled: () => setConfirmingDelete(false),
    onSuccess: async () => {
      onDeleted();
      await queryClient.invalidateQueries({ queryKey: ['comments', projectId, taskId] });
    },
  });

  function startEdit() {
    setText(comment.body);
    setFieldError(false);
    updateMutation.reset();
    setEditing(true);
  }

  function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = UpdateCommentRequestSchema.safeParse({ body: text });
    if (!parsed.success) {
      setFieldError(true);
      return;
    }
    setFieldError(false);
    updateMutation.mutate(parsed.data.body);
  }

  return (
    <li className="flex flex-col gap-1 rounded-md border p-3">
      <div className="flex flex-wrap items-baseline gap-2 text-sm">
        <span className="font-medium">{comment.author.name}</span>
        <time dateTime={comment.createdAt} className="text-muted-foreground">
          {formatTimestamp(comment.createdAt)}
        </time>
      </div>
      {editing ? (
        <form onSubmit={onSave} noValidate className="flex flex-col gap-2">
          {updateMutation.isError ? (
            <Alert variant="destructive">{describeChangeError(updateMutation.error)}</Alert>
          ) : null}
          <Label htmlFor={editId}>Edit comment</Label>
          <textarea
            id={editId}
            rows={3}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={text}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? `${editId}-error` : undefined}
            onChange={(event) => setText(event.target.value)}
          />
          {fieldError ? (
            <p id={`${editId}-error`} className="text-sm text-destructive">
              Enter a comment of 1 to 2000 characters
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={updateMutation.isPending}>
              Save comment
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
      )}
      {deleteMutation.isError ? (
        <Alert variant="destructive">{describeChangeError(deleteMutation.error)}</Alert>
      ) : null}
      {!editing && (canEdit || canDelete) ? (
        <div className="flex gap-2">
          {canEdit ? (
            <Button type="button" variant="outline" size="sm" onClick={startEdit}>
              Edit
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                deleteMutation.reset();
                setConfirmingDelete(true);
              }}
            >
              Delete
            </Button>
          ) : null}
        </div>
      ) : null}
      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent>
          <DialogTitle>Delete this comment?</DialogTitle>
          <DialogDescription>This permanently removes the comment.</DialogDescription>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              Confirm delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}

export function CommentsPanel({
  projectId,
  taskId,
  archived,
  role,
}: {
  projectId: string;
  taskId: string;
  archived: boolean;
  role: 'OWNER' | 'MEMBER' | undefined;
}) {
  const queryClient = useQueryClient();
  const userId = useAuth().user?.id;
  const [page, setPage] = useState(1);
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const query = useQuery({
    queryKey: ['comments', projectId, taskId, page],
    queryFn: () => listComments(projectId, taskId, { page, pageSize: PAGE_SIZE }),
  });

  const mutation = useMutation({
    mutationFn: (body: string) => createComment(projectId, taskId, { body }),
    onSuccess: async () => {
      const total = query.data?.meta.total ?? 0;
      setText('');
      setPage(Math.max(1, Math.ceil((total + 1) / PAGE_SIZE)));
      await queryClient.invalidateQueries({ queryKey: ['comments', projectId, taskId] });
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = CreateCommentRequestSchema.safeParse({ body: text });
    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error.issues));
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data.body);
  }

  const totalPages = query.data?.meta.totalPages ?? 0;
  const bodyError = errors['body'];

  return (
    <section className="flex flex-col gap-4" aria-labelledby="comments-heading">
      <h2 id="comments-heading" className="text-lg font-semibold">
        Comments
      </h2>
      {query.isPending ? <LoadingState label="Loading comments…" /> : null}
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : null}
      {query.isSuccess && query.data.data.length === 0 ? (
        <EmptyState title="No comments yet" />
      ) : null}
      {query.isSuccess && query.data.data.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {query.data.data.map((comment) => {
            const { canEdit, canDelete } = commentPermissions({
              userId,
              role,
              comment,
              archived,
            });
            return (
              <CommentItem
                key={comment.id}
                projectId={projectId}
                taskId={taskId}
                comment={comment}
                canEdit={canEdit}
                canDelete={canDelete}
                onDeleted={() => {
                  if (page > 1 && query.data.data.length === 1) setPage(page - 1);
                }}
              />
            );
          })}
        </ul>
      ) : null}
      {totalPages > 1 ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
      {archived ? <p className="text-sm font-medium">Archived: comments are read-only.</p> : null}
      {!archived ? (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2">
          {mutation.isError ? (
            <Alert variant="destructive">{describeAddError(mutation.error)}</Alert>
          ) : null}
          <Label htmlFor="new-comment">Add a comment</Label>
          <textarea
            id="new-comment"
            rows={3}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={text}
            aria-invalid={bodyError ? true : undefined}
            aria-describedby={bodyError ? 'new-comment-error' : undefined}
            onChange={(event) => setText(event.target.value)}
          />
          {bodyError ? (
            <p id="new-comment-error" className="text-sm text-destructive">
              Enter a comment of 1 to 2000 characters
            </p>
          ) : null}
          <div>
            <Button type="submit" disabled={mutation.isPending}>
              Post comment
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
