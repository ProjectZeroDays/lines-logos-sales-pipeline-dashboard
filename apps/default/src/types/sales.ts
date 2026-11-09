export interface Deal {
  id: string;
  title: string;
  company: string;
  contact: string;
  value: number;
  probability: number;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';
  source: 'inbound' | 'outbound' | 'referral' | 'partner';
  completed: boolean;
}

export interface Metric {
  id: string;
  title: string;
  metric: string;
  value: number;
  period: string;
}

export interface StageMetrics {
  stage: string;
  count: number;
  value: number;
  deals: Deal[];
}

export interface ConversionRate {
  from: string;
  to: string;
  rate: number;
}
