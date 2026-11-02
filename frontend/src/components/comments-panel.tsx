import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateCommentRequestSchema } from '@team-task-tracker/shared';
import { useState, type FormEvent } from 'react';
import { fieldErrorsFrom, type FieldErrors } from '@/components/form-field';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api/client';
import { createComment, listComments } from '@/lib/api/comments';

const PAGE_SIZE = 20;

function describeAddError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'You do not have permission';
    if (error.status === 409) return 'This task is archived and cannot be commented on.';
    if (error.status === 404) return 'Not found';
  }
  return 'Something went wrong';
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function CommentsPanel({
  projectId,
  taskId,
  canComment,
}: {
  projectId: string;
  taskId: string;
  canComment: boolean;
}) {
  const queryClient = useQueryClient();
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
          {query.data.data.map((comment) => (
            <li key={comment.id} className="flex flex-col gap-1 rounded-md border p-3">
              <div className="flex flex-wrap items-baseline gap-2 text-sm">
                <span className="font-medium">{comment.author.name}</span>
                <time dateTime={comment.createdAt} className="text-muted-foreground">
                  {formatTimestamp(comment.createdAt)}
                </time>
              </div>
              <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
            </li>
          ))}
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
      {canComment ? (
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
