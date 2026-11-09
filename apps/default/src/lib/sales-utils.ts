import type { Deal, StageMetrics, ConversionRate } from '@/types/sales';

export const STAGE_CONFIG = {
  lead: { label: 'Lead', color: '#64748b' },
  qualified: { label: 'Qualified', color: '#3b82f6' },
  proposal: { label: 'Proposal', color: '#8b5cf6' },
  negotiation: { label: 'Negotiation', color: '#f59e0b' },
  'closed-won': { label: 'Closed Won', color: '#10b981' },
  'closed-lost': { label: 'Closed Lost', color: '#ef4444' }
};

export const STAGE_ORDER = ['lead', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost'];

export function calculateStageMetrics(deals: Deal[]): StageMetrics[] {
  const stageMap = new Map<string, StageMetrics>();
  
  deals.forEach(deal => {
    const existing = stageMap.get(deal.stage);
    if (existing) {
      existing.count++;
      existing.value += deal.value;
      existing.deals.push(deal);
    } else {
      stageMap.set(deal.stage, {
        stage: deal.stage,
        count: 1,
        value: deal.value,
        deals: [deal]
      });
    }
  });

  return STAGE_ORDER.map(stage => 
    stageMap.get(stage) || { stage, count: 0, value: 0, deals: [] }
  );
}

export function calculateConversionRates(deals: Deal[]): ConversionRate[] {
  const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'closed-won'];
  const conversions: ConversionRate[] = [];

  for (let i = 0; i < stages.length - 1; i++) {
    const from = stages[i];
    const to = stages[i + 1];
    
    // A lost deal entered the pipeline, but we do not know how far it got:
    // it counts as a start and never as a step forward.
    const reached = (d: Deal, stage: string) =>
      d.stage !== 'closed-lost' && STAGE_ORDER.indexOf(d.stage) >= STAGE_ORDER.indexOf(stage);
    const fromDeals = deals.filter(d => reached(d, from) || (from === 'lead' && d.stage === 'closed-lost'));
    const toDeals = deals.filter(d => reached(d, to));
    
    const rate = fromDeals.length > 0 
      ? (toDeals.length / fromDeals.length) * 100 
      : 0;

    conversions.push({ from, to, rate });
  }

  return conversions;
}

export function calculatePipelineValue(deals: Deal[]): number {
  return deals
    .filter(d => d.stage !== 'closed-won' && d.stage !== 'closed-lost')
    .reduce((sum, deal) => sum + deal.value, 0);
}

export function calculateWeightedValue(deals: Deal[]): number {
  return deals
    .filter(d => d.stage !== 'closed-won' && d.stage !== 'closed-lost')
    .reduce((sum, deal) => sum + (deal.value * deal.probability), 0);
}

export function calculateWinRate(deals: Deal[]): number {
  const closedDeals = deals.filter(d => 
    d.stage === 'closed-won' || d.stage === 'closed-lost'
  );
  const wonDeals = deals.filter(d => d.stage === 'closed-won');
  
  return closedDeals.length > 0 
    ? (wonDeals.length / closedDeals.length) * 100 
    : 0;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
