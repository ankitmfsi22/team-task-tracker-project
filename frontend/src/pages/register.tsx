import { RegisterRequestSchema } from '@team-task-tracker/shared';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { FormField, fieldErrorsFrom, type FieldErrors } from '@/components/form-field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/client';
import { loginRequest, registerRequest } from '@/lib/api/auth';
import { useAuth } from '@/lib/auth/auth-context';

export function RegisterPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsed = RegisterRequestSchema.safeParse({ email, name, password });
    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error.issues));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await registerRequest(parsed.data);
      const { accessToken } = await loginRequest({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      // PublicOnlyRoute sends the signed-in user to the project list.
      await signIn(accessToken);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setFormError('An account with this email already exists');
      } else {
        setFormError('Something went wrong. Please try again.');
      }
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-xl font-semibold">Register</h1>
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
          label="Name"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors['name'] && 'Enter your name (1 to 100 characters)'}
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors['password'] && 'Use 8 to 128 characters'}
        />
        <Button type="submit" className="w-full" disabled={pending}>
          Create account
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">
        Already registered?{' '}
        <Link to="/login" className="text-primary underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
