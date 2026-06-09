// @ts-nocheck
'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export function useAuth() {
  return useAuthStore();
}

export function useMe() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.me(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });
}

export function useLogin() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: (data: { email: string; password: string }) => authApi.login(data),
    onSuccess: (res: any) => {
      setAuth(res.user, res.accessToken, res.refreshToken);
      toast.success(`Welcome back, ${res.user.fullName}!`);
      router.push('/dashboard');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Login failed');
    },
  });
}

export function useRegister() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: (data: any) => authApi.register(data),
    onSuccess: (res: any) => {
      setAuth(res.user, res.accessToken, res.refreshToken);
      toast.success('Account created! Welcome to FlowForge 🎉');
      router.push('/dashboard');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Registration failed');
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const { refreshToken, logout } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      refreshToken ? authApi.logout(refreshToken) : Promise.resolve(),
    onSettled: () => {
      logout();
      queryClient.clear();
      router.push('/auth/login');
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
    onSuccess: () => {
      toast.success('Reset link sent — check your inbox');
    },
    onError: () => {
      toast.success('If that email exists, a reset link has been sent.');
    },
  });
}
