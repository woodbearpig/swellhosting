import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (_) { return iso; }
};

export const formatDateTime = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch (_) { return iso; }
};

export const eventTypeLabel = (k) => ({
  wedding: 'Wedding',
  birthday: 'Birthday',
  corporate: 'Corporate',
  baby_shower: 'Baby shower',
  bridal_shower: 'Bridal shower',
  grand_opening: 'Grand opening',
  holiday: 'Holiday',
  other: 'Other',
}[k] || (k || '').replace('_', ' '));

export const statusLabel = (k) => ({
  new: 'New',
  needs_follow_up: 'Needs follow-up',
  consult_scheduled: 'Consult scheduled',
  proposal_sent: 'Proposal sent',
  booked: 'Booked',
  archived: 'Archived',
  lost: 'Lost',
}[k] || k);
