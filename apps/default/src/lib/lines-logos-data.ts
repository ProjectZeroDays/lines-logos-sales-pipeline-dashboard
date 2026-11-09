export const LINES_LOGOS_PROJECTS = {
  profile: 'nzKw1ibvmS9RdG22',
  baseline: 'iWAdHjW89wkxW8u4',
  leads: 'wiNSVTzkVhm6kmjK',
  jobs: 'ByXf5mQT7Ukgyw1k',
  references: 'fFk5zwLQHG9Yxujm',
  approved: 'YSp7PKMxTu2ATopW',
  pipeline: '69d7orKUKJ2E4BA7',
} as const;

export const EXCEL_LEAD_IMPORT_FLOW = '01M5Q2KFHAAJ1Q49G654EFMA4H';

export const LEAD_STAGES = [
  { value: 'Lead', label: 'Lead' },
  { value: 'Qualified', label: 'Qualified' },
  { value: 'Proposal', label: 'Proposal' },
  { value: 'Negotiation', label: 'Negotiation' },
  { value: 'Under Contract', label: 'Under Contract' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Lost / Rejected', label: 'Lost / Rejected' },
] as const;

export function checkWrite(result: { ignoredKeys: string[] }) {
  if (result.ignoredKeys.length > 0) {
    throw new Error(`Some answers were not saved: ${result.ignoredKeys.join(', ')}`);
  }
}

export function isoDate(value: string): string | undefined {
  return value ? new Date(`${value}T12:00:00`).toISOString() : undefined;
}

export function inputDate(value: string | null): string {
  return value?.slice(0, 10) ?? '';
}

export function currency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(value);
}

export function recordText(row: unknown): string {
  return String(row ?? '').trim();
}
