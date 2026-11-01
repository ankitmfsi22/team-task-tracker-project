import { LoginRequestSchema } from '@team-task-tracker/shared';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { FormField, fieldErrorsFrom, type FieldErrors } from '@/components/form-field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/client';
import { loginRequest } from '@/lib/api/auth';
import { useAuth } from '@/lib/auth/auth-context';

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsed = LoginRequestSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error.issues));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      const { accessToken } = await loginRequest(parsed.data);
      // PublicOnlyRoute sends the signed-in user to the requested page or the project list.
      await signIn(accessToken);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setFormError('Invalid email or password');
        setPassword('');
      } else {
        setFormError('Something went wrong. Please try again.');
      }
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-xl font-semibold">Log in</h1>
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="mt-4 space-y-4">
        {formError ? <Alert variant="destructive">{formError}</Alert> : null}
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors['email'] && 'Enter a valid email address'}
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors['password'] && 'Enter your password'}
        />
        <Button type="submit" className="w-full" disabled={pending}>
          Log in
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">
        No account?{' '}
        <Link to="/register" className="text-primary underline">
          Register
        </Link>
      </p>
    </main>
  );
}
