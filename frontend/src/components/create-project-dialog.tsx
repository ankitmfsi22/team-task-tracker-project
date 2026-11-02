import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateProjectRequestSchema } from '@team-task-tracker/shared';
import { useState, type FormEvent } from 'react';
import { FormField, fieldErrorsFrom, type FieldErrors } from '@/components/form-field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createProject, projectKeys } from '@/lib/api/projects';

export function CreateProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: projectKeys.all });
      setName('');
      setDescription('');
      onOpenChange(false);
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = CreateProjectRequestSchema.safeParse({
      name,
      description: description.trim() === '' ? undefined : description,
    });
    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error.issues));
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Give the project a name and an optional description.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {mutation.isError ? (
            <Alert variant="destructive">Could not create the project. Please try again.</Alert>
          ) : null}
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
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
