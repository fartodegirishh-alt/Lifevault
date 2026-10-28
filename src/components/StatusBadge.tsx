import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Calendar } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  daysLeft?: number | null;
  className?: string;
  showDays?: boolean;
}

export function StatusBadge({ status, daysLeft, className = '', showDays = true }: StatusBadgeProps) {
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
  let Icon = Calendar;
  let labelText = status;

  switch (status) {
    case 'Active':
      badgeStyle = 'bg-[#DFF1E7] text-emerald-900 border-emerald-300';
      Icon = CheckCircle2;
      break;
    case 'Expiring soon':
      badgeStyle = 'bg-[#FFF3D6] text-amber-900 border-amber-300';
      Icon = AlertTriangle;
      break;
    case 'Expired':
      badgeStyle = 'bg-[#F8E5E7] text-rose-900 border-rose-300';
      Icon = AlertCircle;
      break;
    case 'No expiry date':
      badgeStyle = 'bg-[#E9E3F8] text-purple-900 border-purple-200';
      Icon = Calendar;
      break;
    default:
      badgeStyle = 'bg-slate-100 text-slate-800 border-slate-200';
      Icon = Calendar;
  }

  // Generate days left text
  let daysText = '';
  if (showDays && daysLeft !== null && daysLeft !== undefined) {
    if (daysLeft === 0) {
      daysText = ' (Expires today)';
    } else if (daysLeft > 0) {
      daysText = ` (${daysLeft}d left)`;
    } else {
      daysText = ` (${Math.abs(daysLeft)}d ago)`;
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeStyle} ${className}`}
      role="status"
      aria-label={`Status: ${status}${daysText}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{labelText}{daysText}</span>
    </span>
  );
}

export default StatusBadge;
