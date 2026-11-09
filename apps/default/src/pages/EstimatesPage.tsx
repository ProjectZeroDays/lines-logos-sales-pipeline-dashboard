import { useMemo, useState } from 'react';
import { BriefcaseBusiness, Calculator, Fuel, MapPin, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useLiveNodes } from '@/hooks/use-live-nodes';
import { createNode, getFieldNumber, getFieldValue, getTitle, updateNode, type GenesisNode } from '@/lib/genesis-data';
import { checkWrite, currency, LINES_LOGOS_PROJECTS } from '@/lib/lines-logos-data';

type EstimateDraft = { job: string; client: string; materials: string; laborHours: string; laborRate: string; miles: string; mpg: string; fuel: string; travelHours: string; hotel: string; nights: string; mealRate: string; mealDays: string; other: string; margin: string; status: string };
const blank: EstimateDraft = { job: '', client: '', materials: '', laborHours: '', laborRate: '45', miles: '', mpg: '18', fuel: '', travelHours: '', hotel: '', nights: '0', mealRate: '', mealDays: '0', other: '', margin: '35', status: 'Estimate Draft' };
const num = (value: string) => Number(value) || 0;

export default function EstimatesPage() {
  const { nodes, loading, error, updatedAt, refresh } = useLiveNodes(LINES_LOGOS_PROJECTS.jobs);
  const [draft,setDraft]=useState<EstimateDraft>(blank);
  const [saving,setSaving]=useState(false);
  const [formError,setFormError]=useState('');
  const cost=useMemo(()=>{
    const fuelGallons=draft.mpg?num(draft.miles)/num(draft.mpg):0;
    const fuelCost=fuelGallons*num(draft.fuel);
    const laborCost=num(draft.laborHours)*num(draft.laborRate);
    const travelLabor=num(draft.travelHours)*num(draft.laborRate);
    const lodging=num(draft.hotel)*num(draft.nights);
    const meals=num(draft.mealRate)*num(draft.mealDays);
    const total=num(draft.materials)+laborCost+travelLabor+fuelCost+lodging+meals+num(draft.other);
    const margin=Math.min(85,Math.max(0,num(draft.margin)))/100;
    const bid=margin<1?total/(1-margin):0;
    return {fuelGallons,fuelCost,laborCost,travelLabor,lodging,meals,total,bid,profit:bid-total};
  },[draft]);

  async function saveEstimate(event:React.FormEvent){
    event.preventDefault();
    if(!draft.job.trim()){setFormError('Give this estimate a job name first.');return;}
    setSaving(true);setFormError('');
    try{
      const fields:Record<string,string|number>={
        '/text':draft.job.trim(),'Job Name':draft.job.trim(),'Lead / Client':draft.client.trim()||'Not linked yet',
        'Record Type':'Live record','Job Status':draft.status,'Materials Cost':num(draft.materials),'Labor Hours':num(draft.laborHours),
        'Labor Rate':num(draft.laborRate),'Round-trip Miles':num(draft.miles),'Vehicle MPG':num(draft.mpg),
        'Fuel Price per Gallon':num(draft.fuel),'Travel Hours':num(draft.travelHours),'Hotel per Night':num(draft.hotel),
        'Lodging Nights':num(draft.nights),'Meals per Day':num(draft.mealRate),'Meal Days':num(draft.mealDays),
        'Other Costs':num(draft.other),'Target Margin':Math.min(85,Math.max(0,num(draft.margin)))/100,'Bid Price':Math.round(cost.bid*100)/100,
      };
      const result=await createNode(LINES_LOGOS_PROJECTS.jobs,fields);checkWrite(result);setDraft(blank);await refresh();toast.success('Estimate saved with its cost breakdown');
    }catch(err){setFormError(err instanceof Error?err.message:'The estimate could not be saved.');}finally{setSaving(false);}
  }

  return <div className="space-y-7">
    <header><p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-200/70">Pricing desk</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Estimates &amp; jobs</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">Make the costs visible before you price the work. Every estimate saves its inputs and suggested bid to the shared job register.</p></header>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,.9fr)]">
      <form onSubmit={(e)=>void saveEstimate(e)} className="rounded-2xl border border-white/10 bg-white/[.045] p-5 backdrop-blur-xl sm:p-6">
        <div className="mb-5 flex items-start gap-3"><span className="rounded-xl bg-cyan-300/10 p-2 text-cyan-100"><Calculator className="h-5 w-5"/></span><div><h2 className="font-semibold">Build a job estimate</h2><p className="mt-1 text-sm text-white/55">Use current quotes and trip details for inputs. Nothing is silently looked up or assumed.</p></div></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-white/70 sm:col-span-2">Job name<input required value={draft.job} onChange={(e)=>setDraft({...draft,job:e.target.value})} className="field-input mt-1" /></label>
          <label className="text-sm text-white/70 sm:col-span-2">Lead or client<input value={draft.client} onChange={(e)=>setDraft({...draft,client:e.target.value})} className="field-input mt-1" placeholder="Link the customer by name" /></label>
          <label className="text-sm text-white/70">Materials cost ($)<input type="number" min="0" step=".01" inputMode="decimal" value={draft.materials} onChange={(e)=>setDraft({...draft,materials:e.target.value})} className="field-input mt-1" /></label>
          <label className="text-sm text-white/70">Other costs ($)<input type="number" min="0" step=".01" inputMode="decimal" value={draft.other} onChange={(e)=>setDraft({...draft,other:e.target.value})} className="field-input mt-1" /></label>
          <label className="text-sm text-white/70">On-site labor hours<input type="number" min="0" step=".25" inputMode="decimal" value={draft.laborHours} onChange={(e)=>setDraft({...draft,laborHours:e.target.value})} className="field-input mt-1" /></label>
          <label className="text-sm text-white/70">Labor rate per hour ($)<input type="number" min="0" step=".01" inputMode="decimal" value={draft.laborRate} onChange={(e)=>setDraft({...draft,laborRate:e.target.value})} className="field-input mt-1" /></label>
          <label className="text-sm text-white/70">Round-trip miles<input type="number" min="0" step="1" inputMode="numeric" value={draft.miles} onChange={(e)=>setDraft({...draft,miles:e.target.value})} className="field-input mt-1" /></label>
          <label className="text-sm text-white/70">Vehicle MPG<input type="number" min="1" step=".1" inputMode="decimal" value={draft.mpg} onChange={(e)=>setDraft({...draft,mpg:e.target.value})} className="field-input mt-1" /></label>
          <label className="text-sm text-white/70">Current gas price per gallon ($)<input type="number" min="0" step=".01" inputMode="decimal" value={draft.fuel} onChange={(e)=>setDraft({...draft,fuel:e.target.value})} className="field-input mt-1" /></label>
          <label className="text-sm text-white/70">Travel hours<input type="number" min="0" step=".25" inputMode="decimal" value={draft.travelHours} onChange={(e)=>setDraft({...draft,travelHours:e.target.value})} className="field-input mt-1" /></label>
          <label className="text-sm text-white/70">Hotel per night ($)<input type="number" min="0" step=".01" inputMode="decimal" value={draft.hotel} onChange={(e)=>setDraft({...draft,hotel:e.target.value})} className="field-input mt-1" /></label>
          <label className="text-sm text-white/70">Nights away<input type="number" min="0" step="1" inputMode="numeric" value={draft.nights} onChange={(e)=>setDraft({...draft,nights:e.target.value})} className="field-input mt-1" /></label>
          <label className="text-sm text-white/70">Meals per day ($)<input type="number" min="0" step=".01" inputMode="decimal" value={draft.mealRate} onChange={(e)=>setDraft({...draft,mealRate:e.target.value})} className="field-input mt-1" /></label>
          <label className="text-sm text-white/70">Meal days<input type="number" min="0" step="1" inputMode="numeric" value={draft.mealDays} onChange={(e)=>setDraft({...draft,mealDays:e.target.value})} className="field-input mt-1" /></label>
          <label className="text-sm text-white/70">Target gross margin (%)<input type="number" min="0" max="85" step="1" inputMode="numeric" value={draft.margin} onChange={(e)=>setDraft({...draft,margin:e.target.value})} className="field-input mt-1" /><span className="mt-1 block text-xs text-white/40">Editable starting point: 35%. Compare against the local market and your own costs.</span></label>
          <label className="text-sm text-white/70">Job status<select value={draft.status} onChange={(e)=>setDraft({...draft,status:e.target.value})} className="field-input mt-1"><option>Estimate Draft</option><option>Bid Sent</option><option>Negotiation</option><option>Under Contract</option><option>In Progress</option><option>Completed</option><option>Lost</option></select></label>
        </div>
        {formError&&<p role="alert" className="mt-4 text-sm text-red-200">{formError}</p>}
        <button disabled={saving} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 font-semibold text-slate-950 disabled:opacity-50"><Plus className="h-4 w-4"/>{saving?'Saving estimate…':'Save estimate'}</button>
      </form>
      <aside className="space-y-5">
        <section className="rounded-2xl border border-cyan-200/15 bg-cyan-200/[.045] p-5 backdrop-blur-xl sm:p-6"><div className="flex items-center gap-2 text-cyan-100"><Fuel className="h-5 w-5"/><h2 className="font-semibold">Price picture</h2></div><div className="mt-5 space-y-3 text-sm"><CostLine label="Materials" value={num(draft.materials)}/><CostLine label="On-site labor" value={cost.laborCost}/><CostLine label="Travel time" value={cost.travelLabor}/><CostLine label={`Fuel · ${cost.fuelGallons.toFixed(1)} gallons`} value={cost.fuelCost}/><CostLine label="Lodging" value={cost.lodging}/><CostLine label="Meals" value={cost.meals}/><CostLine label="Other costs" value={num(draft.other)}/><div className="border-t border-white/10 pt-3"><CostLine label="Estimated cost" value={cost.total} strong/></div><CostLine label={`Suggested bid at ${Math.min(85,Math.max(0,num(draft.margin)))}% margin`} value={cost.bid} strong/><CostLine label="Gross profit at that bid" value={cost.profit}/></div><p className="mt-4 rounded-xl border border-white/10 bg-black/10 p-3 text-xs leading-5 text-white/55">Bid = estimated cost ÷ (1 − target margin). Verify supplier quotes, route distance, tax, scope, and competitor pricing before sending.</p></section>
        <section className="rounded-2xl border border-white/10 bg-white/[.04] p-5"><div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-amber-100"/><h2 className="font-semibold">Live market lookup</h2></div><p className="mt-2 text-sm leading-6 text-white/55">A current web-search step is not connected yet. For now, enter a quoted fuel rate, lodging, and meals yourself; the estimate does not invent live prices.</p></section>
      </aside>
    </div>
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.04]"><div className="flex items-center gap-2 border-b border-white/10 p-5"><BriefcaseBusiness className="h-5 w-5 text-cyan-100"/><div><h2 className="font-semibold">Estimates and jobs</h2><p className="text-sm text-white/50">{nodes.length} saved record{nodes.length===1?'':'s'}</p></div></div>{loading?<div className="space-y-3 p-5" aria-busy="true">{[0,1].map(i=><div key={i} className="h-16 animate-pulse rounded-xl bg-white/5"/>)}</div>:error&&updatedAt==null?<p role="alert" className="p-5 text-sm text-red-100">Job records could not be loaded. <button onClick={()=>void refresh()} className="underline">Try again</button></p>:nodes.length===0?<p className="p-7 text-center text-sm text-white/55">Your first saved estimate will appear here.</p>:<div className="divide-y divide-white/8">{nodes.map((row)=><JobProfitRow key={row.id} row={row} refresh={refresh}/>)}</div>}{error&&updatedAt!=null&&<p className="border-t border-white/10 px-5 py-3 text-xs text-white/55">Showing saved job records. The last refresh did not complete. <button onClick={()=>void refresh()} className="underline">Refresh now</button></p>}</section>
  </div>;
}

type ActualDraft = { materials: string; labor: string; miles: string; fuel: string; other: string; revenue: string };

const actualInputs: { key: keyof ActualDraft; label: string; field: string }[] = [
  { key: 'materials', label: 'Materials cost', field: '/attributes/@actmt' },
  { key: 'labor', label: 'Labor cost', field: '/attributes/@actlb' },
  { key: 'miles', label: 'Round-trip miles', field: '/attributes/@actml' },
  { key: 'fuel', label: 'Fuel cost', field: '/attributes/@actfc' },
  { key: 'other', label: 'Other costs', field: '/attributes/@actoc' },
  { key: 'revenue', label: 'Final revenue', field: '/attributes/@actrev' },
];

function JobProfitRow({ row, refresh }: { row: GenesisNode; refresh: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [draft, setDraft] = useState<ActualDraft>(() => ({
    materials: getFieldNumber(row, 'Actual Materials Cost', '@actmt')?.toString() ?? '',
    labor: getFieldNumber(row, 'Actual Labor Cost', '@actlb')?.toString() ?? '',
    miles: getFieldNumber(row, 'Actual Round-trip Miles', '@actml')?.toString() ?? '',
    fuel: getFieldNumber(row, 'Actual Fuel Cost', '@actfc')?.toString() ?? '',
    other: getFieldNumber(row, 'Actual Other Costs', '@actoc')?.toString() ?? '',
    revenue: getFieldNumber(row, 'Actual Revenue', '@actrev')?.toString() ?? '',
  }));

  const estimated = {
    materials: getFieldNumber(row, 'Materials Cost', '@matrl'),
    laborHours: getFieldNumber(row, 'Labor Hours', '@labhr'),
    laborRate: getFieldNumber(row, 'Labor Rate', '@labor'),
    miles: getFieldNumber(row, 'Round-trip Miles', '@miles'),
    mpg: getFieldNumber(row, 'Vehicle MPG', '@mpg01'),
    fuelPrice: getFieldNumber(row, 'Fuel Price per Gallon', '@fuelp'),
    travelHours: getFieldNumber(row, 'Travel Hours', '@travel'),
    hotel: getFieldNumber(row, 'Hotel per Night', '@hotel'),
    nights: getFieldNumber(row, 'Lodging Nights', '@nights'),
    mealRate: getFieldNumber(row, 'Meals per Day', '@mealcst'),
    mealDays: getFieldNumber(row, 'Meal Days', '@mealday'),
    other: getFieldNumber(row, 'Other Costs', '@other'),
  };
  const estimateComplete = Object.values(estimated).every((value) => value !== null) && (estimated.mpg ?? 0) > 0;
  const estimatedCost = estimateComplete
    ? (estimated.materials ?? 0) + (estimated.laborHours ?? 0) * (estimated.laborRate ?? 0) +
      (estimated.travelHours ?? 0) * (estimated.laborRate ?? 0) +
      ((estimated.mpg ?? 0) > 0 ? (estimated.miles ?? 0) / (estimated.mpg ?? 1) * (estimated.fuelPrice ?? 0) : 0) +
      (estimated.hotel ?? 0) * (estimated.nights ?? 0) + (estimated.mealRate ?? 0) * (estimated.mealDays ?? 0) +
      (estimated.other ?? 0)
    : null;
  const bid = getFieldNumber(row, 'Bid Price', '@bidprc');
  const estimatedProfit = estimatedCost !== null && bid !== null ? bid - estimatedCost : null;

  const actual = {
    materials: getFieldNumber(row, 'Actual Materials Cost', '@actmt'),
    labor: getFieldNumber(row, 'Actual Labor Cost', '@actlb'),
    miles: getFieldNumber(row, 'Actual Round-trip Miles', '@actml'),
    fuel: getFieldNumber(row, 'Actual Fuel Cost', '@actfc'),
    other: getFieldNumber(row, 'Actual Other Costs', '@actoc'),
    revenue: getFieldNumber(row, 'Actual Revenue', '@actrev'),
  };
  const actualComplete = Object.values(actual).every((value) => value !== null);
  const actualCost = actualComplete
    ? (actual.materials ?? 0) + (actual.labor ?? 0) + (actual.fuel ?? 0) + (actual.other ?? 0)
    : null;
  const actualProfit = actualCost !== null && actual.revenue !== null ? actual.revenue - actualCost : null;
  const profitVariance = actualProfit !== null && estimatedProfit !== null ? actualProfit - estimatedProfit : null;

  async function saveActuals(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      const fields: Record<string, number> = {};
      for (const input of actualInputs) {
        const raw = draft[input.key].trim();
        if (!raw) continue;
        const value = Number(raw);
        if (!Number.isFinite(value) || value < 0) {
          setSaveError('Enter zero or a positive number for each actual.');
          setSaving(false);
          return;
        }
        fields[input.field] = value;
      }
      if (Object.keys(fields).length === 0) {
        setSaveError('Enter at least one actual figure before saving.');
        setSaving(false);
        return;
      }
      const result = await updateNode(LINES_LOGOS_PROJECTS.jobs, row.id, fields);
      checkWrite(result);
      await refresh();
      toast.success('Actual job figures saved');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'The actual figures could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  const preciseCurrency = (value: number) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value);

  return <article className="space-y-4 p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0"><p className="truncate font-medium">{getTitle(row, 'Job Name', '@jobnm') ?? 'Unnamed job'}</p><p className="text-sm text-white/50">{getFieldValue(row, 'Lead / Client', '@leadnm') ?? 'Client not linked'} · {getFieldValue(row, 'Job Status', '@jobst') ?? 'Estimate Draft'}</p></div>
      <div className="shrink-0 sm:text-right"><p className="font-semibold tabular-nums">{currency(bid ?? 0)}</p><p className="text-xs text-white/45">Bid price</p></div>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-white/8 bg-black/10 p-3"><p className="text-xs text-white/50">Estimated gross profit</p><p className="mt-1 font-semibold tabular-nums">{estimatedProfit === null ? 'Estimate inputs incomplete' : preciseCurrency(estimatedProfit)}</p><p className="mt-1 text-xs text-white/40">Bid less estimated costs</p></div>
      <div className="rounded-xl border border-white/8 bg-black/10 p-3"><p className="text-xs text-white/50">Actual gross profit</p><p className={`mt-1 font-semibold tabular-nums ${actualProfit === null ? 'text-white/55' : actualProfit >= 0 ? 'text-emerald-200' : 'text-red-200'}`}>{actualProfit === null ? 'Actuals incomplete' : preciseCurrency(actualProfit)}</p><p className="mt-1 text-xs text-white/40">Final revenue less entered actual costs</p></div>
      <div className="rounded-xl border border-white/8 bg-black/10 p-3"><p className="text-xs text-white/50">Profit vs estimate</p><p className="mt-1 font-semibold tabular-nums">{profitVariance === null ? 'Available when both are complete' : `${profitVariance >= 0 ? '+' : ''}${preciseCurrency(profitVariance)}`}</p><p className="mt-1 text-xs text-white/40">Actual profit minus estimated profit</p></div>
    </div>
    {actual.miles !== null && estimated.miles !== null && <p className="text-xs text-white/50">Mileage: {actual.miles.toLocaleString()} actual vs {estimated.miles.toLocaleString()} estimated round-trip miles.</p>}
    <button type="button" aria-expanded={editing} onClick={() => setEditing((open) => !open)} className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-medium text-cyan-100 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{editing ? 'Hide actuals' : actualComplete ? 'Edit actuals' : 'Enter actuals'}</button>
    {editing && <form onSubmit={(event) => void saveActuals(event)} className="rounded-xl border border-white/10 bg-black/10 p-4">
      <p className="text-sm font-medium">Record final job figures</p><p className="mt-1 text-xs leading-5 text-white/50">Add figures as they become available. Include lodging, meals, and any unitemized expenses in Other costs. Profit appears only after every actual and final revenue are recorded.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{actualInputs.map((input) => <label key={input.key} className="text-xs text-white/65">{input.label}<input type="number" min="0" step={input.key === 'miles' ? '0.1' : '0.01'} inputMode="decimal" autoComplete="off" value={draft[input.key]} onChange={(event) => setDraft((current) => ({ ...current, [input.key]: event.target.value }))} className="field-input mt-1" /></label>)}</div>
      {saveError && <p role="alert" className="mt-3 text-sm text-red-200">{saveError}</p>}
      <button type="submit" disabled={saving} className="mt-4 min-h-11 rounded-xl bg-cyan-300 px-4 font-semibold text-slate-950 disabled:opacity-50">{saving ? 'Saving…' : 'Save actual figures'}</button>
    </form>}
  </article>;
}

function CostLine({label,value,strong=false}:{label:string;value:number;strong?:boolean}){return <div className={`flex justify-between gap-4 ${strong?'font-semibold text-white':'text-white/65'}`}><span>{label}</span><span className="shrink-0 tabular-nums">{currency(value)}</span></div>}
