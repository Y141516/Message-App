import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

export function getMessageTypeLabel(type: string): string {
  switch (type) {
    case 'emergency_medical': return 'Medical Emergency';
    case 'emergency_transport': return 'Transport Emergency';
    case 'emergency_urgent': return 'Urgent Emergency';
    default: return 'Message';
  }
}

export function getEmergencyColor(type: string): string {
  switch (type) {
    case 'emergency_medical': return 'text-red-400 bg-red-400/10';
    case 'emergency_transport': return 'text-blue-400 bg-blue-400/10';
    case 'emergency_urgent': return 'text-orange-400 bg-orange-400/10';
    default: return 'text-gold bg-gold/10';
  }
}
