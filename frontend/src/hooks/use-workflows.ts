// @ts-nocheck
'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { workflowsApi } from '@/lib/api';

export function useWorkflows(params?: any) {
  return useQuery({
    queryKey: ['workflows', params],
    queryFn: () => workflowsApi.list(params),
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ['workflows', id],
    queryFn: () => workflowsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => workflowsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow created');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to create'),
  });
}

export function useUpdateWorkflow(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => workflowsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflows', id] });
      qc.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow saved');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to save'),
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workflowsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow archived');
    },
    onError: () => toast.error('Failed to archive workflow'),
  });
}

export function useExecuteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, inputData }: { id: string; inputData?: any }) =>
      workflowsApi.execute(id, inputData),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['workflows'] });
      if (res?.status === 'success') toast.success('Workflow executed successfully');
      else toast.error('Workflow execution failed');
    },
    onError: () => toast.error('Failed to trigger workflow'),
  });
}

export function useWorkflowExecutions(workflowId: string, params?: any) {
  return useQuery({
    queryKey: ['executions', workflowId, params],
    queryFn: () => workflowsApi.executions(workflowId, params),
    enabled: !!workflowId,
    refetchInterval: 5000,
  });
}

export function useDuplicateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workflowsApi.duplicate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow duplicated');
    },
  });
}
