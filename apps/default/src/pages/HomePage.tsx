import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, BriefcaseBusiness, CalendarDays, Clock3, DollarSign, RefreshCw, Target, Users, ArrowUpRight } from 'lucide-react';
import { useLiveNodes } from '@/hooks/use-live-nodes';
import { getFieldLabel, getFieldNumber, getFieldValue, getTitle } from '@/lib/genesis-data';
import { LINES_LOGOS_PROJECTS, currency } from '@/lib/lines-logos-data';
import { MetricCard } from '@/components/MetricCard';
import { PipelineStage } from '@/components/PipelineStage';
import { ConversionFunnel } from '@/components/ConversionFunnel';
import { VelocityChart } from '@/components/VelocityChart';
import { DealsModal } from '@/components/DealsModal';
import { calculateConversionRates, calculateStageMetrics } from '@/lib/sales-utils';
import type { Deal, StageMetrics } from '@/types/sales';

function periodStart(period: 'Week' | 'Month' | 'Year') {
  const now = new Date();
  if (period === 'Year') return new Date(now.getFullYear(), 0, 1);
  if (period === 'Month') return new Date(now.getFullYear(), now.getMonth(), 1);
  const day = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function inPeriod(value: string | null, start: Date) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date >= start;
}

function dayKey(value: string | null) {
  if (!value) return null;
  const dateOnly = value.match(/^\d{4}-\d{2}-\d{2}$/);
  if (dateOnly) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dayLabel(value: string | null) {
  const key = dayKey(value);
  if (!key) return 'Date not set';
  const [year, month, day] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(year, month - 1, day));
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

function LoadingCards() {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/5" />)}</div>;
}

export default function HomePage() {
  const [period, setPeriod] = useState<'Week' | 'Month' | 'Year'>('Week');
  const [selectedStage, setSelectedStage] = useState<StageMetrics | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pipeline = useLiveNodes(LINES_LOGOS_PROJECTS.pipeline);
  const baselines = useLiveNodes(LINES_LOGOS_PROJECTS.baseline);
  const leads = useLiveNodes(LINES_LOGOS_PROJECTS.leads);
  const jobs = useLiveNodes(LINES_LOGOS_PROJECTS.jobs);
  const todayKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);
  const todayQueue = useMemo(() => {
    const activeLeads = leads.nodes.map((row) => {
      const stageLabel = getFieldLabel(row, 'Stage', '@stg02') ?? 'Lead';
      const stage = stageLabel.toLowerCase();
      const appointment = getFieldValue(row, 'Appointment Date', '@apptd2');
      const followUp = getFieldValue(row, 'Next Follow-up Date', '@foll2');
      return {
        row,
        name: getTitle(row, 'Lead Name', '@ldnam') ?? 'Unnamed lead',
        stage,
        stageLabel,
        appointment,
        followUp,
      };
    }).filter((lead) => !/(completed|lost|rejected|closed won|closed lost)/.test(lead.stage));
    return {
      appointments: activeLeads.filter((lead) => dayKey(lead.appointment) === todayKey),
      overdue: activeLeads.filter((lead) => {
        const followUpDay = dayKey(lead.followUp);
        return followUpDay != null && followUpDay < todayKey;
      }),
      missing: activeLeads.filter((lead) => !lead.appointment && !lead.followUp),
    };
  }, [leads.nodes, todayKey]);

  const deals = useMemo(() => pipeline.nodes.map(toDeal), [pipeline.nodes]);
  const stageMetrics = useMemo(() => calculateStageMetrics(deals), [deals]);
  const start = useMemo(() => periodStart(period), [period]);
  const metrics = useMemo(() => {
    const contacted = leads.nodes.filter((row) => inPeriod(getFieldValue(row, 'Contacted Date', '@contd2'), start)).length;
    const responded = leads.nodes.filter((row) => inPeriod(getFieldValue(row, 'Responded Date', '@resp2'), start)).length;
    const potential = leads.nodes.filter((row) => inPeriod(getFieldValue(row, 'Potential Work Date', '@potd2'), start)).length;
    const negotiations = leads.nodes.filter((row) => inPeriod(getFieldValue(row, 'Negotiation Date', '@negot2'), start)).length;
    const contracts = leads.nodes.filter((row) => inPeriod(getFieldValue(row, 'Contract Date', '@contr2'), start)).length;
    const completed = jobs.nodes.filter((row) => inPeriod(getFieldValue(row, 'Completed Date', '@doned'), start));
    const lost = leads.nodes.filter((row) => inPeriod(getFieldValue(row, 'Lost Date', '@lostd2'), start)).length;
    return {
      contacted,
      responded,
      potential,
      negotiations,
      contracts,
      completed: completed.length,
      revenue: completed.reduce((sum, row) => sum + (getFieldNumber(row, 'Actual Revenue', '@actrev') ?? 0), 0),
      lost,
    };
  }, [leads.nodes, jobs.nodes, start]);
  const baselineMap = useMemo(() => new Map(baselines.nodes.map((row) => [getFieldValue(row, 'Metric', '@met01') ?? '', getFieldNumber(row, 'Value', '@value')])), [baselines.nodes]);
  const sampleRows = deals.filter((deal) => getFieldLabel(pipeline.nodes.find((row) => row.id === deal.id)!, 'Record Origin', '@org01') === 'Sample data').length;
  const refreshAll = () => { void pipeline.refresh(); void baselines.refresh(); void leads.refresh(); void jobs.refresh(); };
  const currentDataLoading = pipeline.loading || leads.loading || jobs.loading;
  const dataError = [pipeline, leads, jobs].some((result) => result.error && result.updatedAt == null);
  const queueGroups = [
    { title: 'Appointments today', kind: 'appointment' as const, icon: CalendarDays, items: todayQueue.appointments },
    { title: 'Overdue follow-ups', kind: 'overdue' as const, icon: Clock3, items: todayQueue.overdue },
    { title: 'Missing a next step', kind: 'missing' as const, icon: ArrowUpRight, items: todayQueue.missing },
  ];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl"><p className="mb-3 text-xs font-semibold uppercase tracking-[.22em] text-cyan-200/75">Lines &amp; Logos</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Make the next job easier to win.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-white/60">Keep the pipeline, follow-up dates, job costs, and approved work in one calm place.</p></div>
          <div className="flex flex-wrap gap-3">
            <Link to="/leads" className="flex min-h-11 items-center gap-2 rounded-xl bg-cyan-400 px-4 font-semibold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"><Users className="h-4 w-4" />Open leads</Link>
            <Link to="/estimates" className="flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 font-medium text-white transition hover:bg-white/10"><DollarSign className="h-4 w-4" />Build an estimate</Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="today-queue-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs uppercase tracking-[.18em] text-white/45">Your next moves</p><h2 id="today-queue-heading" className="mt-1 text-xl font-semibold">Today queue</h2><p className="mt-1 text-sm text-white/55">Appointments, overdue follow-ups, and active leads without a date for the next step.</p></div>
          <span className="rounded-full border border-cyan-200/15 bg-cyan-200/[.05] px-3 py-1.5 text-sm text-cyan-50/80">{todayQueue.appointments.length + todayQueue.overdue.length + todayQueue.missing.length} items</span>
        </div>
        {leads.loading ? <div className="grid gap-3 md:grid-cols-3" aria-busy="true">{[0, 1, 2].map((index) => <div key={index} className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/5" />)}</div> : <div className="grid gap-3 md:grid-cols-3">
          {queueGroups.map((group) => {
            const Icon = group.icon;
            return <section key={group.kind} aria-label={group.title} className="rounded-2xl border border-white/10 bg-white/[.04] p-4 backdrop-blur-md">
              <div className="flex items-center justify-between gap-3"><h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold"><span className="rounded-lg bg-cyan-300/10 p-2 text-cyan-100"><Icon className="h-4 w-4" /></span><span className="truncate">{group.title}</span></h3><span className="tabular-nums text-sm text-white/55">{group.items.length}</span></div>
              {group.items.length ? <ul className="mt-3 space-y-2">{group.items.map((item) => <li key={item.row.id}><Link to="/leads" aria-label={`Open ${item.name} in leads`} className="block min-h-11 rounded-xl border border-white/8 bg-black/10 px-3 py-2.5 transition hover:border-cyan-200/20 hover:bg-white/[.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"><span className="block truncate text-sm font-medium text-white">{item.name}</span><span className="mt-1 block truncate text-xs text-white/55">{group.kind === 'appointment' ? 'Appointment today' : group.kind === 'overdue' ? `Follow-up overdue · ${dayLabel(item.followUp)}` : `${item.stageLabel} · choose a next step`}</span></Link></li>)}</ul> : <p className="mt-4 rounded-xl border border-white/5 bg-black/10 px-3 py-4 text-sm text-white/50">{group.kind === 'appointment' ? 'No appointments on the calendar today.' : group.kind === 'overdue' ? 'No overdue follow-ups. Nice work.' : 'Every active lead has a dated next step.'}</p>}
            </section>;
          })}
        </div>}
        {leads.error && leads.updatedAt != null && <p className="text-sm text-amber-100/80">Showing the most recent lead records. A refresh did not complete. <button type="button" onClick={() => void leads.refresh()} className="underline underline-offset-4">Refresh now</button></p>}
        {leads.error && leads.updatedAt == null && <div role="alert" className="rounded-2xl border border-red-300/20 bg-red-400/5 p-4 text-sm text-red-100">Lead records could not be loaded yet. <button type="button" onClick={() => void leads.refresh()} className="underline">Try again</button></div>}
      </section>

      <section aria-labelledby="period-heading" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs uppercase tracking-[.18em] text-white/45">Dated activity</p><h2 id="period-heading" className="mt-1 text-xl font-semibold">What moved this {period.toLowerCase()}</h2><p className="mt-1 text-sm text-white/55">Counts come from dated lead and job records, not the owner-reported baseline.</p></div><div className="relative z-50 flex w-fit gap-1 rounded-xl border border-white/10 bg-slate-950/50 p-1">{(['Week', 'Month', 'Year'] as const).map((value) => <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)} className={`min-h-10 rounded-lg px-4 text-sm transition ${period === value ? 'bg-cyan-300/15 text-cyan-100' : 'text-white/55 hover:text-white'}`}>{value}</button>)}</div></div>
        {currentDataLoading ? <LoadingCards /> : <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard title="Leads contacted" value={String(metrics.contacted)} subtitle={`${period} to date`} icon={Users} />
          <MetricCard title="Responses received" value={String(metrics.responded)} subtitle={`${period} to date`} icon={Activity} />
          <MetricCard title="Potential work" value={String(metrics.potential)} subtitle={`${period} to date`} icon={Target} />
          <MetricCard title="In negotiation" value={String(metrics.negotiations)} subtitle={`${period} to date`} icon={Activity} />
          <MetricCard title="Under contract" value={String(metrics.contracts)} subtitle={`${period} to date`} icon={BriefcaseBusiness} />
          <MetricCard title="Jobs completed" value={String(metrics.completed)} subtitle={`${period} to date`} icon={CalendarDays} />
          <MetricCard title="Job revenue" value={currency(metrics.revenue)} subtitle={`${period} to date`} icon={DollarSign} />
          <MetricCard title="Lost / rejected" value={String(metrics.lost)} subtitle={`${period} to date`} icon={ArrowUpRight} />
        </div>}
        {[leads, jobs].some((result) => result.error && result.updatedAt != null) && <p className="text-sm text-amber-100/80">Showing the most recent records. A refresh did not complete. <button type="button" onClick={refreshAll} className="underline underline-offset-4">Refresh now</button></p>}
        {dataError && <div role="alert" className="rounded-2xl border border-red-300/20 bg-red-400/5 p-4 text-sm text-red-100">Activity records could not be loaded yet. <button type="button" onClick={refreshAll} className="underline">Try again</button></div>}
      </section>

      <section className="rounded-2xl border border-amber-200/15 bg-amber-200/[.04] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-amber-100/65">Owner-reported starting point</p><h2 className="mt-1 text-lg font-semibold">Baseline figures, not yet verified</h2><p className="mt-1 text-sm text-white/55">The source document is not uploaded and the reporting period was not specified.</p></div><span className="rounded-full border border-amber-100/20 px-3 py-1 text-xs text-amber-50/80">Unverified</span></div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">{['Total Lead Count', 'Leads Contacted', 'Leads Responded', 'Leads With Potential Work', 'Leads in Negotiations', 'Leads Under Contract', 'Jobs Completed', 'Gross Revenue From Jobs', 'Leads Lost / Rejected Offers'].map((name) => <div key={name} className="rounded-xl border border-white/8 bg-black/10 p-3"><p className="text-xs leading-5 text-white/50">{name}</p><p className="mt-1 text-lg font-semibold tabular-nums">{name.includes('Revenue') ? currency(baselineMap.get(name) ?? 0) : baselineMap.get(name) == null ? 'Not supplied' : String(baselineMap.get(name))}</p></div>)}</div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs uppercase tracking-[.18em] text-white/45">Original pipeline</p><h2 className="mt-1 text-xl font-semibold">Pipeline by Stage</h2><p className="mt-1 text-sm text-white/55">The existing eight rows are retained and marked as sample data.</p></div><button onClick={refreshAll} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white/80 hover:bg-white/10"><RefreshCw className="h-4 w-4" />Refresh</button></div>
        {pipeline.loading ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-3" aria-busy="true">{[0,1,2,3,4,5].map((i)=><div key={i} className="h-36 animate-pulse rounded-2xl bg-white/5" />)}</div> : <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{stageMetrics.map((metrics,index)=><PipelineStage key={metrics.stage} metrics={metrics} index={index} onClick={()=>{setSelectedStage(metrics);setIsModalOpen(true);}} />)}</div>}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2"><ConversionFunnel conversions={calculateConversionRates(deals)} /><VelocityChart stages={stageMetrics} /></div>
        <p className="text-xs text-white/45">{sampleRows} historical sample deals are included in the stage totals. Replace or supplement them with real leads to make this your live sales pipeline.</p>
      </section>
      <section className="grid gap-4 md:grid-cols-3"><Link to="/leads" className="rounded-2xl border border-white/10 bg-white/[.04] p-5 transition hover:bg-white/[.07]"><p className="text-sm font-semibold">Bring in lead records</p><p className="mt-1 text-sm text-white/55">Upload a supported export, review duplicates, and work follow-up dates.</p></Link><Link to="/estimates" className="rounded-2xl border border-white/10 bg-white/[.04] p-5 transition hover:bg-white/[.07]"><p className="text-sm font-semibold">Price work transparently</p><p className="mt-1 text-sm text-white/55">See labor, travel, fuel, lodging, meals, costs, and target margin.</p></Link><Link to="/library" className="rounded-2xl border border-white/10 bg-white/[.04] p-5 transition hover:bg-white/[.07]"><p className="text-sm font-semibold">Share approved work</p><p className="mt-1 text-sm text-white/55">Keep references and album links organized with permission status.</p></Link></section>
      <DealsModal isOpen={isModalOpen} onClose={()=>{setIsModalOpen(false);setTimeout(()=>setSelectedStage(null),250);}} stageMetrics={selectedStage} />
    </div>
  );
}

