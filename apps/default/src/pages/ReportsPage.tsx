import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import { DollarSign, Share2, Target, TrendingUp, Users } from 'lucide-react';
import { useLiveNodes } from '@/hooks/use-live-nodes';
import { getFieldValue, getFieldNumber, getTitle } from '@/lib/genesis-data';
import { LINES_LOGOS_PROJECTS } from '@/lib/lines-logos-data';
import { calculateStageMetrics, calculateWinRate, formatPercent } from '@/lib/sales-utils';
import type { Deal, StageMetrics } from '@/types/sales';

const SOURCE_CONFIG = {
  inbound: { label: 'Inbound', chart: 1 },
  outbound: { label: 'Outbound', chart: 2 },
  referral: { label: 'Referral', chart: 3 },
  partner: { label: 'Partner', chart: 4 },
} as const;

// Tailwind JIT cannot see computed class names, so chart tokens are mapped verbatim.
const CHART_BG = { 1: 'bg-chart-1', 2: 'bg-chart-2', 3: 'bg-chart-3', 4: 'bg-chart-4', 5: 'bg-chart-5' } as const;
const CHART_FILL = { 1: 'hsl(var(--chart-1))', 2: 'hsl(var(--chart-2))', 3: 'hsl(var(--chart-3))', 4: 'hsl(var(--chart-4))', 5: 'hsl(var(--chart-5))' } as const;

const SOURCE_ORDER = ['inbound', 'outbound', 'referral', 'partner'] as const;

function monthKey(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string | null): string {
  if (!key) return 'Date not set';
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

function toDeal(row: ReturnType<typeof useLiveNodes>['nodes'][number]): Deal {
  const rawStage = getFieldValue(row, 'Stage', '@stg01') ?? 'lead';
  const stage = rawStage === 'closed-won' ? 'closed-won' : rawStage === 'closed-lost' ? 'closed-lost' : rawStage as Deal['stage'];
  const rawProbability = getFieldNumber(row, 'Probability', '@prob1') ?? 0;
  const probability = rawProbability > 1 ? rawProbability / 100 : rawProbability;
  return {
    id: row.id,
    title: getTitle(row, 'Deal Name', 'Title') ?? 'Untitled deal',
    company: getFieldValue(row, 'Company', '@cmp01') ?? '',
    contact: getFieldValue(row, 'Contact', '@cnt01') ?? '',
    value: getFieldNumber(row, 'Deal Value', '@val01') ?? 0,
    probability,
    stage,
    source: (getFieldValue(row, 'Source', '@src01') ?? 'inbound') as Deal['source'],
    completed: stage === 'closed-won',
  };
}

interface SourceRow {
  source: string;
  label: string;
  chart: number;
  count: number;
  value: number;
  won: number;
  lost: number;
}

export default function ReportsPage() {
  const pipeline = useLiveNodes(LINES_LOGOS_PROJECTS.pipeline);
  const dealRows = useMemo(() =>
    pipeline.nodes.map((row) => ({ deal: toDeal(row), createdAt: row.createdAt })),
    [pipeline.nodes],
  );
  const deals = useMemo(() => dealRows.map((d) => d.deal), [dealRows]);

  const stageMetrics = useMemo(() => calculateStageMetrics(deals), [deals]);
  const winRate = useMemo(() => calculateWinRate(deals), [deals]);

  const totalDeals = deals.length;
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
  const weightedValue = deals.reduce((sum, d) => sum + d.value * d.probability, 0);
  const avgDealSize = totalDeals > 0 ? totalValue / totalDeals : 0;

  const sourceMetrics = useMemo(() => {
    const map = new Map<string, SourceRow>();
    SOURCE_ORDER.forEach((s) =>
      map.set(s, { source: s, label: SOURCE_CONFIG[s].label, chart: SOURCE_CONFIG[s].chart, count: 0, value: 0, won: 0, lost: 0 }),
    );
    deals.forEach((d) => {
      if (!map.has(d.source)) {
        map.set(d.source, { source: d.source, label: d.source, chart: 1, count: 0, value: 0, won: 0, lost: 0 });
      }
      const m = map.get(d.source)!;
      m.count += 1;
      m.value += d.value;
      if (d.stage === 'closed-won') m.won += 1;
      if (d.stage === 'closed-lost') m.lost += 1;
    });
    return Array.from(map.values()).filter((m) => m.count > 0).sort((a, b) => b.value - a.value);
  }, [deals]);

  const monthlyTrend = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    dealRows.forEach(({ deal, createdAt }) => {
      const key = monthKey(createdAt);
      if (!key) return;
      if (!map.has(key)) map.set(key, { count: 0, value: 0 });
      const m = map.get(key)!;
      m.count += 1;
      m.value += deal.value;
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [dealRows]);

  const pipelineValue = stageMetrics.reduce((sum, m) => sum + m.value, 0);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-200/70">Pipeline reports</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Where deals come from</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
          Source breakdown, win rate by channel, and monthly pipeline trend computed from the live pipeline records.
        </p>
      </header>

      <div className="grid gap-3 lg:grid-cols-5">
        <MetricCard title="Total deals" value={String(totalDeals)} subtitle="Pipeline records" icon={Users} />
        <MetricCard title="Pipeline value" value={currency(pipelineValue)} subtitle="Open stages only" icon={DollarSign} />
        <MetricCard title="Weighted value" value={currency(weightedValue)} subtitle="Value × probability" icon={TrendingUp} />
        <MetricCard title="Win rate" value={formatPercent(winRate)} subtitle="Won ÷ closed deals" icon={Target} />
        <MetricCard title="Avg deal size" value={currency(avgDealSize)} subtitle="Total ÷ deal count" icon={Share2} />
      </div>

      <section className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="source-heading" className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg p-5 sm:p-6 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-white/45">Pipeline by source</p>
              <h2 id="source-heading" className="mt-1 text-lg font-semibold">Deal count and value</h2>
            </div>
            <span className="rounded-full border border-cyan-200/15 bg-cyan-200/[.05] px-3 py-1 text-xs text-cyan-50/80">
              {sourceMetrics.reduce((sum, s) => sum + s.count, 0)} deals
            </span>
          </div>
          {sourceMetrics.length === 0 ? (
            <p className="py-16 text-center text-sm text-white/60">Add deals with a source set to see this chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={sourceMetrics} layout="vertical" margin={{ left: 90, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis type="number" domain={[0, 100]} stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
                <YAxis type="category" dataKey="label" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} width={90} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }}
                  formatter={(value: number) => [`${Math.round(value)} deals`, 'Source']}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {sourceMetrics.map((entry) => (
                    <Cell key={`cell-${entry.source}`} fill={CHART_FILL[entry.chart as keyof typeof CHART_FILL] ?? CHART_FILL[1]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="mt-5 space-y-3">
            {sourceMetrics.map((s) => (
              <div key={s.source} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${CHART_BG[s.chart as keyof typeof CHART_BG] ?? CHART_BG[1]}`} />
                  <span className="text-white">{s.label}</span>
                </div>
                <div className="text-right text-white/60">
                  <div className="tabular-nums font-medium">{s.count} deals</div>
                  <div className="text-xs">{currency(s.value)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="winrate-heading" className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg p-5 sm:p-6 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-white/45">Win rate by source</p>
              <h2 id="winrate-heading" className="mt-1 text-lg font-semibold">Closed won ÷ closed deals</h2>
            </div>
          </div>
          {sourceMetrics.length === 0 ? (
            <p className="py-16 text-center text-sm text-white/60">No closed deals yet to measure win rate.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={sourceMetrics.map((s) => ({ ...s, rate: s.won + s.lost > 0 ? Math.round((s.won / (s.won + s.lost)) * 100) : 0 }))}
                layout="vertical"
                margin={{ left: 90, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis type="number" domain={[0, 100]} stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
                <YAxis type="category" dataKey="label" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} width={90} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }}
                  formatter={(value: number, name: string, item: { payload?: SourceRow & { rate: number } }) => {
                    const payload = item.payload as SourceRow & { rate: number };
                    const closed = payload.won + payload.lost;
                    return [`${value}%`, `${payload.won} won of ${closed} closed`];
                  }}
                />
                <Bar dataKey="rate" radius={[0, 8, 8, 0]}>
                  {sourceMetrics.map((entry) => (
                    <Cell key={`win-${entry.source}`} fill={CHART_FILL[entry.chart as keyof typeof CHART_FILL] ?? CHART_FILL[1]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="mt-5 space-y-3">
            {sourceMetrics.map((s) => {
              const closed = s.won + s.lost;
              const rate = closed > 0 ? Math.round((s.won / closed) * 100) : 0;
              return (
                <div key={s.source} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${CHART_BG[s.chart as keyof typeof CHART_BG] ?? CHART_BG[1]}`} />
                    <span className="text-white">{s.label}</span>
                  </div>
                  <div className="text-right text-white/60">
                    <div className="tabular-nums font-medium">{rate}%</div>
                    <div className="text-xs">{s.won} won of {closed} closed</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </section>

      <section aria-labelledby="trend-heading" className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg p-5 sm:p-6 shadow-lg shadow-black/40">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-white/45">Monthly pipeline trend</p>
            <h2 id="trend-heading" className="mt-1 text-lg font-semibold">Deals and value by month</h2>
            <p className="mt-1 text-sm text-white/55">Grouped by record creation date.</p>
          </div>
        </div>
        {monthlyTrend.length === 0 ? (
          <p className="py-20 text-center text-sm text-white/60">Add deals to see the monthly pipeline trend.</p>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={monthlyTrend.map(([key, m]) => ({ month: monthLabel(key), count: m.count, value: m.value, key }))} margin={{ left: 10, right: 10, top: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
              <YAxis type="number" dataKey="count" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }}
                formatter={(value: number) => [`${Math.round(value)} deals`, 'Month']}
              />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-1))" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {monthlyTrend.map(([key, m]) => (
            <div key={key} className="rounded-xl border border-white/8 bg-black/10 p-3">
              <p className="text-xs text-white/50">{monthLabel(key)}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-white">{m.count} deals</p>
              <p className="mt-1 text-xs text-white/45">{currency(m.value)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Link to="/" className="rounded-2xl border border-white/10 bg-white/[.04] p-5 transition hover:bg-white/[.07]">
          <p className="text-sm font-semibold">Back to dashboard</p>
          <p className="mt-1 text-sm text-white/55">Overview, today queue, and stage view.</p>
        </Link>
        <Link to="/leads" className="rounded-2xl border border-white/10 bg-white/[.04] p-5 transition hover:bg-white/[.07]">
          <p className="text-sm font-semibold">Work the leads</p>
          <p className="mt-1 text-sm text-white/55">Import, add, and date your next step.</p>
        </Link>
        <Link to="/estimates" className="rounded-2xl border border-white/10 bg-white/[.04] p-5 transition hover:bg-white/[.07]">
          <p className="text-sm font-semibold">Price the work</p>
          <p className="mt-1 text-sm text-white/55">Build estimates with bid price and actuals.</p>
        </Link>
      </section>
    </div>
  );
}

function currency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}
