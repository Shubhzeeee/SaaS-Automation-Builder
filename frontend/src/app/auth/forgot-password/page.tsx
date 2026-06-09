'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Mail } from 'lucide-react';
import { useForgotPassword } from '@/hooks/use-auth';
import { Button, LinkButton, Input, Label } from '@/components/ui';

const schema = z.object({ email: z.string().email('Enter a valid email') });

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { mutate: forgot, isPending } = useForgotPassword();
  const { register, handleSubmit, formState: { errors }, getValues } = useForm({ resolver: zodResolver(schema) });

  if (sent) return (
    <div className="space-y-6 text-center animate-fade-up">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
        <Mail className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Check your inbox</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
          We sent a reset link to <strong>{getValues('email')}</strong>. It expires in 1 hour.
        </p>
      </div>
      <LinkButton href="/auth/login" variant="outline" className="w-full gap-2">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </LinkButton>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold">Forgot password?</h1>
        <p className="text-sm text-muted-foreground mt-1">We'll send a reset link to your email.</p>
      </div>
      <form onSubmit={handleSubmit((d: any) => forgot(d.email, { onSuccess: () => setSent(true) }))} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Email address</Label>
          <Input type="email" placeholder="you@company.com" leftIcon={<Mail className="h-4 w-4" />}
            error={errors.email?.message as string} {...register('email')} />
        </div>
        <Button type="submit" className="w-full" loading={isPending}>Send reset link</Button>
      </form>
      <LinkButton href="/auth/login" variant="ghost" className="w-full gap-2">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </LinkButton>
    </div>
  );
}
