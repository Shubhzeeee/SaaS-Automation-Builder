// @ts-nocheck
'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { integrationsApi, analyticsApi, billingApi, usersApi } from '@/lib/api';

// ── Integrations ──────────────────────────────────────────────────────────────

export function useIntegrationCatalog() {
  return useQuery({
    queryKey: ['integration-catalog'],
    queryFn: () => integrationsApi.catalog(),
    staleTime: Infinity,
  });
}

export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationsApi.list(),
  });
}

export function useConnectIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => integrationsApi.connect(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Integration connected');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Connection failed'),
  });
}

export function useDisconnectIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => integrationsApi.disconnect(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Integration disconnected');
    },
  });
}

export function useTestIntegration() {
  return useMutation({
    mutationFn: (id: string) => integrationsApi.test(id),
    onSuccess: (res: any) => {
      if (res?.status === 'connected') toast.success('Connection is healthy ✓');
      else toast.error('Connection test failed');
    },
  });
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export function useDashboardStats() {
  return useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => analyticsApi.dashboard(),
    refetchInterval: 30_000,
  });
}

export function useExecutionTimeSeries(range: '7d' | '30d' | '90d' = '30d') {
  return useQuery({
    queryKey: ['analytics', 'timeseries', range],
    queryFn: () => analyticsApi.timeSeries(range),
  });
}

export function useAuditLogs(params?: any) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => analyticsApi.auditLogs(params),
  });
}

// ── Billing ───────────────────────────────────────────────────────────────────

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: () => billingApi.subscription(),
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: (data: any) => billingApi.createCheckout(data),
    onSuccess: (res: any) => {
      if (res?.url) window.location.href = res.url;
    },
    onError: () => toast.error('Failed to open checkout'),
  });
}

// ── Users ─────────────────────────────────────────────────────────────────────

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => usersApi.profile(),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => usersApi.updateProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile updated');
    },
  });
}

export function useOrgMembers() {
  return useQuery({
    queryKey: ['org-members'],
    queryFn: () => usersApi.members(),
  });
}
