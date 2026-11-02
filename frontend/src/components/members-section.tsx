import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AddMemberRequestSchema, type MemberResponse } from '@team-task-tracker/shared';
import { useState, type FormEvent } from 'react';
import { FormField, fieldErrorsFrom, type FieldErrors } from '@/components/form-field';
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
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api/client';
import { addMember, listMembers, projectDetailKeys, removeMember } from '@/lib/api/projects';

function addMemberMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'No user with this email';
    if (error.status === 403) return 'You do not have permission';
    if (error.code === 'PROJECT_ARCHIVED') return 'This project is archived';
    if (error.status === 409) return 'This user is already a member';
  }
  return 'Could not add the member. Please try again.';
}

function removeMemberMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'LAST_OWNER') return 'A project needs at least one owner';
    if (error.status === 403) return 'You do not have permission';
    if (error.code === 'PROJECT_ARCHIVED') return 'This project is archived';
  }
  return 'Could not remove the member. Please try again.';
}

// canManage is true only for an OWNER of a non-archived project; otherwise the list is read-only.
export function MembersSection({
  projectId,
  canManage,
}: {
  projectId: string;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const membersKey = projectDetailKeys.members(projectId);
  const members = useQuery({ queryKey: membersKey, queryFn: () => listMembers(projectId) });

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [removing, setRemoving] = useState<MemberResponse | null>(null);

  const add = useMutation({
    mutationFn: (body: { email: string; role: 'OWNER' | 'MEMBER' }) => addMember(projectId, body),
    onSuccess: async () => {
      setEmail('');
      await queryClient.invalidateQueries({ queryKey: membersKey });
    },
  });
  const remove = useMutation({
    mutationFn: (userId: string) => removeMember(projectId, userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: membersKey });
    },
    onSettled: () => setRemoving(null),
  });

  function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    remove.reset();
    const parsed = AddMemberRequestSchema.safeParse({ email, role });
    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error.issues));
      return;
    }
    setErrors({});
    add.mutate(parsed.data);
  }

  let list;
  if (members.isPending) {
    list = <LoadingState label="Loading members…" />;
  } else if (members.isError) {
    list = <ErrorState error={members.error} onRetry={() => void members.refetch()} />;
  } else {
    list = (
      <ul className="divide-y divide-border rounded-md border border-border">
        {members.data.data.map((member) => (
          <li key={member.userId} className="flex items-center justify-between gap-4 p-3">
            <div className="min-w-0">
              <p className="font-medium">{member.name}</p>
              <p className="truncate text-sm text-muted-foreground">{member.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{member.role}</Badge>
              {canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`Remove ${member.name}`}
                  onClick={() => {
                    add.reset();
                    remove.reset();
                    setRemoving(member);
                  }}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section aria-labelledby="members-heading" className="space-y-3">
      <h2 id="members-heading" className="text-lg font-semibold">
        Members
      </h2>
      {remove.isError ? (
        <Alert variant="destructive">{removeMemberMessage(remove.error)}</Alert>
      ) : null}
      {list}
      {canManage ? (
        <form onSubmit={onAdd} noValidate className="space-y-3 rounded-md border border-border p-4">
          {add.isError ? <Alert variant="destructive">{addMemberMessage(add.error)}</Alert> : null}
          <FormField
            label="Email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={errors['email'] && 'Enter a valid email address'}
          />
          <div className="space-y-1">
            <Label htmlFor="member-role">Role</Label>
            <select
              id="member-role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="MEMBER">MEMBER</option>
              <option value="OWNER">OWNER</option>
            </select>
          </div>
          <Button type="submit" disabled={add.isPending}>
            Add member
          </Button>
        </form>
      ) : null}
      <Dialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member</DialogTitle>
            <DialogDescription>
              {removing ? `Remove ${removing.name} from this project?` : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => removing && remove.mutate(removing.userId)}
            >
              Confirm remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
