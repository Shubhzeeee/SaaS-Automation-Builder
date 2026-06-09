import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy') {
  return format(new Date(date), fmt);
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy HH:mm');
}

export function formatDuration(ms: number | null) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export function formatNumber(n: number | string) {
  return Number(n).toLocaleString();
}

export function truncate(str: string, len = 50) {
  if (!str) return '';
  return str.length <= len ? str : str.slice(0, len) + '…';
}

export const STATUS_COLORS: Record<string, string> = {
  active: 'text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400',
  success: 'text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400',
  paused: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400',
  pending: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400',
  running: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400',
  draft: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400',
  error: 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400',
  failed: 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400',
  archived: 'text-slate-400 bg-slate-50 dark:bg-slate-900 dark:text-slate-500',
  disconnected: 'text-slate-400 bg-slate-100 dark:bg-slate-800',
  connected: 'text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400',
};

export function getStatusColor(status: string) {
  return STATUS_COLORS[status] ?? 'text-slate-600 bg-slate-100';
}

export const PLAN_BADGE: Record<string, string> = {
  free: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  starter: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  pro: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  enterprise: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};
