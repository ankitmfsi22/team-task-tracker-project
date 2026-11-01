import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 p-6 text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border p-10 text-center">
      <p className="text-base font-semibold">{title}</p>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

function describeError(error: unknown): { message: string; retryable: boolean } {
  if (error instanceof ApiError) {
    if (error.status === 403) return { message: 'You do not have permission', retryable: false };
    if (error.status === 404) return { message: 'Not found', retryable: false };
  }
  return { message: 'Something went wrong', retryable: true };
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { message, retryable } = describeError(error);
  return (
    <Alert variant="destructive" className="flex items-center justify-between gap-4">
      <span>{message}</span>
      {retryable && onRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </Alert>
  );
}
