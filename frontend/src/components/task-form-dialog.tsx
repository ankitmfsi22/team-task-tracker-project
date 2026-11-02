import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreateTaskRequestSchema,
  TaskPrioritySchema,
  UpdateTaskRequestSchema,
  type MemberResponse,
  type TaskPriority,
  type TaskResponse,
  type UpdateTaskRequest,
} from '@team-task-tracker/shared';
import { useId, useState, type FormEvent } from 'react';
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
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api/client';
import { createTask, updateTask } from '@/lib/api/tasks';

const SELECT_CLASS =
  'h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring';

type TaskFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
} & (
  | { mode: 'create'; members: MemberResponse[]; task?: undefined }
  | { mode: 'edit'; task: TaskResponse; members?: undefined }
);

// The date input has no time of day, so a due date is the end of that day in UTC.
const toDueDate = (date: string) => `${date}T23:59:59Z`;
const todayUtc = () => new Date().toISOString().slice(0, 10);

const TITLE_ERROR = 'Enter a title of 1 to 200 characters';
const DESCRIPTION_ERROR = 'Use at most 5000 characters';
const PAST_ERROR = 'Due date cannot be in the past';

export function TaskFormDialog(props: TaskFormDialogProps) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.mode === 'create' ? 'New task' : 'Edit task'}</DialogTitle>
          <DialogDescription>
            {props.mode === 'create'
              ? 'Fill in the details of the new task.'
              : 'Change the details of this task.'}
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so every opening starts from the current values. */}
        <TaskForm {...props} />
      </DialogContent>
    </Dialog>
  );
}

function TaskForm(props: TaskFormDialogProps) {
  const { mode, projectId, onOpenChange } = props;
  const task = props.task;
  const queryClient = useQueryClient();
  const priorityId = useId();
  const assigneeId = useId();

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'MEDIUM');
  const [date, setDate] = useState(task?.dueDate?.slice(0, 10) ?? '');
  const [assignee, setAssignee] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Edit sends only the fields that differ from the stored task.
  const changes: UpdateTaskRequest = {};
  if (task) {
    if (title !== task.title) changes.title = title;
    if (description !== (task.description ?? '')) {
      changes.description = description.trim() === '' ? null : description;
    }
    if (priority !== task.priority) changes.priority = priority;
    if (date !== (task.dueDate?.slice(0, 10) ?? '')) {
      changes.dueDate = date === '' ? null : toDueDate(date);
    }
  }
  const unchanged = mode === 'edit' && Object.keys(changes).length === 0;

  const mutation = useMutation({
    mutationFn: async (body: unknown) => {
      if (mode === 'create') return createTask(projectId, CreateTaskRequestSchema.parse(body));
      return updateTask(projectId, task?.id ?? '', UpdateTaskRequestSchema.parse(body));
    },
    onSuccess: async () => {
      const keys: unknown[][] = [['tasks', projectId]];
      if (task) {
        keys.push(['task', projectId, task.id], ['activity', projectId, task.id]);
      }
      await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      onOpenChange(false);
    },
    onError: (error) => {
      if (!(error instanceof ApiError)) {
        setFormError('Something went wrong');
        return;
      }
      if (error.status === 403) {
        setFormError('You do not have permission');
      } else if (error.status === 409) {
        if (mode === 'create') {
          setFormError('This project is archived, so tasks cannot be added.');
        } else {
          setFormError('This task is archived, so it cannot be edited. It was reloaded.');
          void queryClient.invalidateQueries({ queryKey: ['task', projectId, task?.id] });
          void queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
        }
      } else if (error.status === 400) {
        const mentionsDueDate = `${error.message} ${JSON.stringify(error.details ?? '')}`.includes(
          'dueDate',
        );
        if (mentionsDueDate) {
          setErrors({
            dueDate: error.message.includes('dueDate') ? error.message : 'Choose a valid due date',
          });
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError('Something went wrong');
      }
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const dateChanged = mode === 'create' ? date !== '' : 'dueDate' in changes;
    if (dateChanged && date !== '' && date < todayUtc()) {
      setErrors({ dueDate: PAST_ERROR });
      return;
    }
    const candidate =
      mode === 'create'
        ? {
            title,
            description: description.trim() === '' ? undefined : description,
            priority,
            dueDate: date === '' ? undefined : toDueDate(date),
            assigneeId: assignee === '' ? undefined : assignee,
          }
        : changes;
    const parsed = (
      mode === 'create' ? CreateTaskRequestSchema : UpdateTaskRequestSchema
    ).safeParse(candidate);
    if (!parsed.success) {
      const found = fieldErrorsFrom(parsed.error.issues);
      setErrors({
        ...(found['title'] ? { title: TITLE_ERROR } : {}),
        ...(found['description'] ? { description: DESCRIPTION_ERROR } : {}),
        ...(found['dueDate'] ? { dueDate: 'Enter a valid due date' } : {}),
        ...(found['assigneeId'] ? { assigneeId: 'Choose a project member' } : {}),
      });
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError ? <Alert variant="destructive">{formError}</Alert> : null}
      <FormField
        label="Title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        error={errors['title']}
      />
      <FormField
        label="Description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        error={errors['description']}
      />
      <div className="space-y-1">
        <Label htmlFor={priorityId}>Priority</Label>
        <select
          id={priorityId}
          className={SELECT_CLASS}
          value={priority}
          onChange={(event) => {
            const next = TaskPrioritySchema.safeParse(event.target.value);
            if (next.success) setPriority(next.data);
          }}
        >
          {TaskPrioritySchema.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <FormField
          label="Due date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          error={errors['dueDate']}
        />
        <p className="text-xs text-muted-foreground">The due date is the end of that day in UTC.</p>
      </div>
      {props.mode === 'create' ? (
        <div className="space-y-1">
          <Label htmlFor={assigneeId}>Assignee</Label>
          <select
            id={assigneeId}
            className={SELECT_CLASS}
            value={assignee}
            onChange={(event) => setAssignee(event.target.value)}
          >
            <option value="">Unassigned</option>
            {props.members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <DialogFooter>
        <Button type="submit" disabled={mutation.isPending || unchanged}>
          {mode === 'create' ? 'Create task' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  );
}
