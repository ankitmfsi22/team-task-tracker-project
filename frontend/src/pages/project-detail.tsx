import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UpdateProjectRequestSchema, type ProjectDetailResponse } from '@team-task-tracker/shared';
import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router';
import { FormField, fieldErrorsFrom, type FieldErrors } from '@/components/form-field';
import { MembersSection } from '@/components/members-section';
import { ErrorState, LoadingState } from '@/components/states';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ApiError } from '@/lib/api/client';
import {
  archiveProject,
  getProject,
  projectDetailKeys,
  projectKeys,
  updateProject,
} from '@/lib/api/projects';

function writeErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'You do not have permission';
    if (error.code === 'PROJECT_ARCHIVED') return 'This project is archived';
  }
  return 'Something went wrong. Please try again.';
}

function EditProjectDialog({
  project,
  open,
  onOpenChange,
  onError,
}: {
  project: ProjectDetailResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onError: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: (body: { name: string; description: string | null | undefined }) =>
      updateProject(project.id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: projectDetailKeys.detail(project.id) });
      await queryClient.invalidateQueries({ queryKey: projectKeys.all });
      onOpenChange(false);
    },
    // The message is shown on the page, so close the modal to keep the page reachable.
    onError: (error) => {
      onError(writeErrorMessage(error));
      onOpenChange(false);
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = UpdateProjectRequestSchema.safeParse({
      name,
      description: description.trim() === '' ? null : description,
    });
    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error.issues));
      return;
    }
    setErrors({});
    mutation.mutate({ name: parsed.data.name ?? name, description: parsed.data.description });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>Change the name or description.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={errors['name'] && 'Enter a name of 1 to 100 characters'}
          />
          <FormField
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            error={errors['description'] && 'Use at most 2000 characters'}
          />
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectDetailPage() {
  const { projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: projectDetailKeys.detail(projectId),
    queryFn: () => getProject(projectId),
  });

  const archive = useMutation({
    mutationFn: () => archiveProject(projectId),
    onError: (error) => setWriteError(writeErrorMessage(error)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: projectDetailKeys.detail(projectId) });
      await queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
    onSettled: () => setArchiving(false),
  });

  if (query.isPending) return <LoadingState label="Loading project…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const project = query.data;
  const isArchived = project.archivedAt !== null;
  const isOwner = project.role === 'OWNER';
  // Hidden, not disabled: a MEMBER or any role on an archived project has no write actions.
  const canWrite = isOwner && !isArchived;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{project.name}</h1>
            {isArchived ? <Badge variant="secondary">Archived</Badge> : null}
          </div>
          {canWrite ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setWriteError(null);
                  setEditing(true);
                }}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setWriteError(null);
                  setArchiving(true);
                }}
              >
                Archive
              </Button>
            </div>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">Role: {project.role}</p>
        {project.description ? <p>{project.description}</p> : null}
        {writeError ? <Alert variant="destructive">{writeError}</Alert> : null}
      </header>

      <MembersSection projectId={project.id} canManage={canWrite} />

      {canWrite ? (
        <EditProjectDialog
          key={`${project.name}|${project.description ?? ''}`}
          project={project}
          open={editing}
          onOpenChange={setEditing}
          onError={setWriteError}
        />
      ) : null}
      <Dialog open={archiving} onOpenChange={setArchiving}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive project</DialogTitle>
            <DialogDescription>
              Archived projects become read-only. This cannot be undone here.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              disabled={archive.isPending}
              onClick={() => archive.mutate()}
            >
              Confirm archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
