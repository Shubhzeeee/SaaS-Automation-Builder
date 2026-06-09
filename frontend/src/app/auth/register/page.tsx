'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail, User, Building2, ArrowRight, Check } from 'lucide-react';
import { useRegister } from '@/hooks/use-auth';
import { Button, Input, Label, Progress } from '@/components/ui';
import { cn } from '@/lib/utils';

const schema = z.object({
  fullName: z.string().min(2, 'At least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters').regex(/[A-Z]/, 'Needs uppercase').regex(/[0-9]/, 'Needs a number'),
  organizationName: z.string().optional(),
});

function strengthScore(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

export default function RegisterPage() {
  const [show, setShow] = useState(false);
  const { mutate: register, isPending } = useRegister();
  const { register: field, handleSubmit, watch, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
  const pw = watch('password', '');
  const score = strengthScore(pw);
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['', 'bg-red-500', 'bg-orange-400', 'bg-amber-400', 'bg-emerald-500'];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-sm text-muted-foreground">Start automating for free — no credit card needed</p>
      </div>

      <form onSubmit={handleSubmit((d: any) => register(d))} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input placeholder="Jane Smith" leftIcon={<User className="h-4 w-4" />}
              error={errors.fullName?.message as string} {...field('fullName')} />
          </div>
          <div className="space-y-1.5">
            <Label>Organization <span className="text-muted-foreground/60 font-normal">(optional)</span></Label>
            <Input placeholder="Acme Corp" leftIcon={<Building2 className="h-4 w-4" />} {...field('organizationName')} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Work Email</Label>
          <Input type="email" placeholder="you@company.com" autoComplete="email"
            leftIcon={<Mail className="h-4 w-4" />} error={errors.email?.message as string}
            {...field('email')} />
        </div>

        <div className="space-y-1.5">
          <Label>Password</Label>
          <Input type={show ? 'text' : 'password'} placeholder="Create a strong password"
            leftIcon={<Lock className="h-4 w-4" />} error={errors.password?.message as string}
            rightIcon={
              <button type="button" onClick={() => setShow(!show)} className="hover:text-foreground transition-colors">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            {...field('password')} />
          {pw && (
            <div className="space-y-1.5 pt-1">
              <div className="flex gap-1">
                {[1,2,3,4].map(i => (
                  <div key={i} className={cn('h-1.5 flex-1 rounded-full transition-all duration-300', i <= score ? strengthColors[score] : 'bg-muted')} />
                ))}
              </div>
              <p className={cn('text-xs font-medium', score >= 3 ? 'text-emerald-600' : score >= 2 ? 'text-amber-600' : 'text-red-500')}>
                {strengthLabels[score]}
              </p>
            </div>
          )}
        </div>

        <Button type="submit" className="w-full" size="lg" loading={isPending} rightIcon={<ArrowRight className="h-4 w-4" />}>
          Create free account
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          By signing up you agree to our <Link href="#" className="text-primary hover:underline">Terms</Link> and <Link href="#" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/auth/login" className="font-semibold text-primary hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
