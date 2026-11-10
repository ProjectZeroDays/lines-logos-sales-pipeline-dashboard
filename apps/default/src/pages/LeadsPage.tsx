import { useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { CalendarDays, FileUp, Plus, Search, UserRoundPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useLiveNodes } from '@/hooks/use-live-nodes';
import { createNode, getFieldLabel, getFieldValue, getTitle, updateNode } from '@/lib/genesis-data';
import { checkWrite, EXCEL_LEAD_IMPORT_FLOW, inputDate, isoDate, LEAD_STAGES, LINES_LOGOS_PROJECTS } from '@/lib/lines-logos-data';
import { runFlow } from '@/lib/genesis-flows';
import type { GenesisNode } from '@/lib/genesis-data';

type LeadDraft = { name: string; company: string; contact: string; email: string; phone: string; location: string; stage: string; value: string; notes: string; smsConsent: string };
type ParsedLead = Partial<LeadDraft> & { name: string };
const emptyLead: LeadDraft = { name: '', company: '', contact: '', email: '', phone: '', location: '', stage: 'Lead', value: '', notes: '', smsConsent: 'Unknown' };

function normalized(value: unknown) { return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''); }
function normalizeSmsConsent(value: unknown) {
  const raw = normalized(value);
  if (!raw) return 'Unknown';
  if (['notopt', 'notconsent', 'notsubscrib', 'optout', 'optedout', 'unsubscribed', 'declined', 'denied', 'never', 'false', 'no'].some((term) => raw.includes(term))) return 'Not opted in';
  if (['optedin', 'optin', 'consented', 'subscribed', 'yes', 'true'].some((term) => raw.includes(term))) return 'Opted in';
  return 'Unknown';
}
function leadIdentity(lead: ParsedLead) { return lead.email?.trim().toLowerCase() || `${lead.name.trim().toLowerCase()}|${lead.company?.trim().toLowerCase() ?? ''}`; }
function mapImportedRow(row: Record<string, unknown>): ParsedLead | null {
  const values = new Map(Object.entries(row).map(([key, value]) => [normalized(key), String(value ?? '').trim()]));
  const pick = (...keys: string[]) => keys.map(normalized).map((key) => values.get(key)).find((value) => value != null && value !== '') ?? '';
  const name = pick('Lead Name', 'Name', 'Company Name', 'Business', 'Client', 'Organization');
  if (!name) return null;
  const stageText = pick('Stage', 'Status');
  const stage = LEAD_STAGES.find((item) => item.label.toLowerCase() === stageText.toLowerCase())?.value ?? 'Lead';
  const smsConsent = normalizeSmsConsent(pick('SMS Consent', 'Text Consent', 'SMS Opt In', 'SMS Opt-In', 'Text Message Consent'));
  return { name, company: pick('Company', 'Business Name', 'Organization'), contact: pick('Contact Name', 'Contact', 'Person'), email: pick('Email', 'Email Address'), phone: pick('Phone', 'Telephone', 'Mobile'), location: pick('Service Location', 'Location', 'City', 'Address'), stage, value: pick('Estimated Value', 'Value', 'Deal Value'), notes: pick('Notes', 'Description', 'Details'), smsConsent };
}
function parseFile(text: string, fileName: string): ParsedLead[] {
  const extension = fileName.split('.').pop()?.toLowerCase();
  let rows: Record<string, unknown>[] = [];
  if (extension === 'csv' || extension === 'tsv') {
    const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: 'greedy', delimiter: extension === 'tsv' ? '\t' : '' });
    if (result.errors.length) throw new Error(result.errors[0].message);
    rows = result.data;
  } else if (extension === 'json') {
    const data: unknown = JSON.parse(text);
    const array = Array.isArray(data) ? data : typeof data === 'object' && data != null && Array.isArray((data as { leads?: unknown }).leads) ? (data as { leads: unknown[] }).leads : null;
    if (!array) throw new Error('JSON needs an array of lead records, or a leads array.');
    rows = array.filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry != null);
  } else if (extension === 'xml') {
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    if (xml.querySelector('parsererror')) throw new Error('This XML file could not be read.');
    const entries = Array.from(xml.querySelectorAll('lead, row, record, item'));
    rows = entries.map((entry) => Object.fromEntries(Array.from(entry.children).map((child) => [child.tagName, child.textContent ?? ''])));
  } else {
    throw new Error('Choose a CSV, TSV, XML, or JSON file. Save Excel or Google Sheets exports as CSV first.');
  }
  const mapped = rows.map(mapImportedRow).filter((row): row is ParsedLead => row != null);
  if (mapped.length === 0) throw new Error('No lead rows with a name were found. Check the first-row column headings.');
  return mapped;
}
function existingIdentity(row: GenesisNode) {
  return getFieldValue(row, 'Email', '@eml02')?.trim().toLowerCase() || `${(getFieldValue(row, 'Lead Name', '@ldnam') ?? '').trim().toLowerCase()}|${(getFieldValue(row, 'Company', '@cmp02') ?? '').trim().toLowerCase()}`;
}
function leadFields(lead: ParsedLead) {
  const fields: Record<string, string | number> = {
    '/text': lead.name,
    'Lead Name': lead.name,
    Stage: lead.stage ?? 'Lead',
    'Record Origin': 'Imported lead',
    Source: 'Imported',
    'Lead Date': new Date().toISOString(),
    'SMS Consent': lead.smsConsent ?? 'Unknown',
  };
  const textFields: [string, string | undefined][] = [['Company', lead.company], ['Contact Name', lead.contact], ['Email', lead.email], ['Phone', lead.phone], ['Service Location', lead.location], ['Notes', lead.notes]];
  textFields.forEach(([key, value]) => { if (value?.trim()) fields[key] = value.trim(); });
  const amount = Number(String(lead.value ?? '').replace(/[$,\s]/g, ''));
  if (String(lead.value ?? '').trim() && Number.isFinite(amount)) fields['Estimated Value'] = amount;
  return fields;
}

export default function LeadsPage() {
  const { nodes, loading, error, updatedAt, refresh } = useLiveNodes(LINES_LOGOS_PROJECTS.leads);
  const [form, setForm] = useState<LeadDraft>(emptyLead);
  const [saving, setSaving] = useState(false);
  const [importRows, setImportRows] = useState<ParsedLead[]>([]);
  const [importName, setImportName] = useState('');
  const [busyImport, setBusyImport] = useState(false);
  const [readingExcel, setReadingExcel] = useState(false);
  const [query, setQuery] = useState('');
  const [formError, setFormError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => nodes.filter((row) => {
    const haystack = [getTitle(row, 'Lead Name', '@ldnam'), getFieldValue(row, 'Company', '@cmp02'), getFieldValue(row, 'Email', '@eml02')].join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase());
  }).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')), [nodes, query]);

  async function saveLead(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) { setFormError('Add a lead or business name first.'); return; }
    setSaving(true); setFormError('');
    try {
      const fields = leadFields({ ...form, name: form.name.trim(), stage: form.stage });
      fields['Record Origin'] = 'Entered manually';
      fields.Source = 'Inbound';
      const result = await createNode(LINES_LOGOS_PROJECTS.leads, fields);
      checkWrite(result);
      setForm(emptyLead);
      await refresh();
      toast.success('Lead added to your pipeline');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'The lead could not be saved.');
    } finally { setSaving(false); }
  }

  async function selectFile(file?: File) {
    if (!file) return;
    setImportName(file.name);
    setImportRows([]);
    setFormError('');
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension === 'xlsx' || extension === 'xls') {
      setReadingExcel(true);
      try {
        const { output } = await runFlow(EXCEL_LEAD_IMPORT_FLOW, { file, sourceName: file.name }, { idempotencyKey: `excel-leads-${file.name}-${file.size}-${file.lastModified}` });
        const raw = output?.leads;
        const decoded: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const items = Array.isArray(decoded) ? decoded : typeof decoded === 'object' && decoded != null && Array.isArray((decoded as { leads?: unknown }).leads) ? (decoded as { leads: unknown[] }).leads : null;
        if (!items) throw new Error('The workbook reader did not return a lead list. Save the sheet as CSV and try again.');
        const parsed = items.filter((item): item is Record<string, unknown> => typeof item === 'object' && item != null).map((item) => ({ name: String(item.name ?? '').trim(), company: String(item.company ?? ''), contact: String(item.contact ?? ''), email: String(item.email ?? ''), phone: String(item.phone ?? ''), location: String(item.location ?? ''), value: String(item.estimatedValue ?? ''), notes: String(item.notes ?? ''), smsConsent: normalizeSmsConsent(item.smsConsent), stage: 'Lead' })).filter((item) => item.name);
        if (!parsed.length) throw new Error('No named lead rows were found in this workbook. Save it as CSV to inspect the column headings.');
        setImportRows(parsed);
        toast.success(`${parsed.length} workbook row${parsed.length === 1 ? '' : 's'} ready to review`);
      } catch (err) {
        setImportRows([]); setImportName('');
        setFormError(err instanceof Error ? err.message : 'That workbook could not be read.');
      } finally { setReadingExcel(false); }
      return;
    }
    try {
      const parsed = parseFile(await file.text(), file.name);
      setImportRows(parsed);
    } catch (err) {
      setImportRows([]); setImportName('');
      setFormError(err instanceof Error ? err.message : 'That file could not be read.');
    }
  }

  async function importLeads() {
    const seen = new Set(nodes.map(existingIdentity));
    const unique: ParsedLead[] = [];
    let duplicates = 0;
    for (const row of importRows) {
      const identity = leadIdentity(row);
      if (seen.has(identity)) { duplicates += 1; continue; }
      seen.add(identity); unique.push(row);
    }
    if (!unique.length) { setFormError('Every previewed row already matches a lead here. Nothing new was added.'); return; }
    setBusyImport(true); setFormError('');
    let saved = 0;
    try {
      for (const row of unique) { const result = await createNode(LINES_LOGOS_PROJECTS.leads, leadFields(row)); checkWrite(result); saved += 1; }
      setImportRows([]); setImportName('');
      if (fileRef.current) fileRef.current.value = '';
      await refresh();
      toast.success(`${saved} lead${saved === 1 ? '' : 's'} imported${duplicates ? `, ${duplicates} duplicate${duplicates === 1 ? '' : 's'} skipped` : ''}`);
    } catch (err) {
      await refresh();
      setFormError(`${saved} rows were saved before the import paused. ${err instanceof Error ? err.message : 'Check the lead list before retrying.'}`);
    } finally { setBusyImport(false); }
  }

  async function changeStage(row: GenesisNode, stage: string) {
    try { const result = await updateNode(LINES_LOGOS_PROJECTS.leads, row.id, { Stage: stage }); checkWrite(result); await refresh(); toast.success('Lead stage updated'); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Stage could not be updated'); }
  }
  async function saveAppointment(row: GenesisNode, date: string) {
    try { const value = isoDate(date); if (value) { const result = await updateNode(LINES_LOGOS_PROJECTS.leads, row.id, { 'Appointment Date': value }); checkWrite(result); } await refresh(); toast.success(date ? 'Appointment date saved' : 'Lead refreshed'); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Appointment date could not be saved'); }
  }

  return (
    <div className="space-y-7">
      <header><p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-200/70">Lead desk</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Leads &amp; follow-up</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">Bring in a contact list, check likely duplicates, and keep the next conversation on the calendar.</p></header>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)]">
        <section className="rounded-2xl border border-white/10 bg-white/[.045] p-5 backdrop-blur-xl sm:p-6"><div className="flex items-start gap-3"><div className="rounded-xl bg-cyan-300/10 p-2 text-cyan-100"><FileUp className="h-5 w-5" /></div><div><h2 className="font-semibold">Import a lead list</h2><p className="mt-1 text-sm text-white/55">CSV, TSV, XML, JSON, or Excel workbooks. Export Google Sheets as CSV or Excel first.</p></div></div>
          <input ref={fileRef} type="file" accept=".csv,.tsv,.xml,.json,.xls,.xlsx,text/csv,application/json,application/xml,text/xml,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event)=>void selectFile(event.target.files?.[0])} className="mt-5 block w-full text-sm text-white/70 file:mr-4 file:min-h-11 file:rounded-xl file:border-0 file:bg-cyan-300/15 file:px-4 file:font-medium file:text-cyan-50 hover:file:bg-cyan-300/25" aria-label="Choose a lead list file" />
          <p className="mt-2 text-xs text-white/45">We match common column names, require a name, and skip duplicate email addresses (or matching name and company). Workbook reading uses AI, so review every row before importing.</p>{readingExcel&&<p role="status" className="mt-3 text-sm text-cyan-100">Reading workbook rows for your review…</p>}
          {importRows.length > 0 && <div className="mt-5 rounded-xl border border-white/10 bg-black/15 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{importName}</p><p className="text-sm text-white/55">{importRows.length} named rows ready to review</p></div><button onClick={()=>void importLeads()} disabled={busyImport} className="min-h-11 rounded-xl bg-cyan-300 px-4 font-semibold text-slate-950 disabled:opacity-50">{busyImport ? 'Importing…' : 'Import leads'}</button></div><div className="mt-3 max-h-40 overflow-y-auto text-sm text-white/70">{importRows.slice(0,5).map((row,i)=><p key={`${row.name}-${i}`} className="truncate py-1">{row.name}{row.company ? ` · ${row.company}` : ''}{row.email ? ` · ${row.email}` : ''} · SMS {row.smsConsent ?? 'Unknown'}</p>)}{importRows.length>5&&<p className="pt-1 text-xs text-white/45">and {importRows.length-5} more</p>}</div></div>}
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/[.045] p-5 backdrop-blur-xl sm:p-6"><div className="flex items-start gap-3"><div className="rounded-xl bg-amber-200/10 p-2 text-amber-100"><UserRoundPlus className="h-5 w-5" /></div><div><h2 className="font-semibold">Add a lead by hand</h2><p className="mt-1 text-sm text-white/55">A quick way to capture a conversation.</p></div></div>
          <form onSubmit={(event)=>void saveLead(event)} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-white/70 sm:col-span-2">Lead or business name<input required autoComplete="organization" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60" /></label>
            <label className="text-sm text-white/70">Contact person<input autoComplete="name" value={form.contact} onChange={(e)=>setForm({...form,contact:e.target.value})} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60" /></label>
            <label className="text-sm text-white/70">Company<input autoComplete="organization" value={form.company} onChange={(e)=>setForm({...form,company:e.target.value})} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60" /></label>
            <label className="text-sm text-white/70">Email<input type="email" autoComplete="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60" /></label>
            <label className="text-sm text-white/70">Phone<input type="tel" autoComplete="tel" value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60" /></label>
            <label className="text-sm text-white/70">SMS consent<select value={form.smsConsent} onChange={(e)=>setForm({...form,smsConsent:e.target.value})} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 text-white"><option>Unknown</option><option>Opted in</option><option>Not opted in</option></select></label>
            <label className="text-sm text-white/70">Service location<input autoComplete="street-address" value={form.location} onChange={(e)=>setForm({...form,location:e.target.value})} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60" /></label>
            <label className="text-sm text-white/70">Estimated value<input type="number" min="0" step="0.01" inputMode="decimal" value={form.value} onChange={(e)=>setForm({...form,value:e.target.value})} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60" /></label>
            <label className="text-sm text-white/70">Stage<select value={form.stage} onChange={(e)=>setForm({...form,stage:e.target.value})} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 text-white">{LEAD_STAGES.map((stage)=><option key={stage.value}>{stage.value}</option>)}</select></label>
            <label className="text-sm text-white/70 sm:col-span-2">Notes<textarea rows={2} value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60" /></label>
            {formError && <p role="alert" className="text-sm text-red-200 sm:col-span-2">{formError}</p>}
            <button disabled={saving} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 font-semibold text-slate-950 disabled:opacity-50 sm:col-span-2"><Plus className="h-4 w-4" />{saving?'Saving…':'Save lead'}</button>
          </form>
        </section>
      </div>
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.04] backdrop-blur-xl"><div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">Your lead register</h2><p className="text-sm text-white/50">{nodes.length} record{nodes.length===1?'':'s'} · updated from the shared lead list</p></div><label className="relative block w-full sm:w-72"><span className="sr-only">Search leads</span><Search className="absolute left-3 top-3 h-4 w-4 text-white/40"/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Find a name, company, or email" className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/45 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60" /></label></div>
        {loading && <div className="space-y-3 p-5" aria-busy="true">{[0,1,2].map(i=><div key={i} className="h-20 animate-pulse rounded-xl bg-white/5" />)}</div>}
        {error && updatedAt == null && <div role="alert" className="p-6 text-sm text-red-100">Your leads could not be loaded. <button onClick={()=>void refresh()} className="underline">Try again</button></div>}
        {!loading && !error && filtered.length===0 && <div className="p-9 text-center"><CalendarDays className="mx-auto h-8 w-8 text-cyan-100/70"/><p className="mt-3 font-medium">{query?'No matching leads':'Your list is ready for its first lead'}</p><p className="mt-1 text-sm text-white/50">Add a lead above or import a CSV, TSV, XML, JSON, or Excel list.</p></div>}
        <div className="divide-y divide-white/8">{filtered.map((row)=>{
          const title=getTitle(row,'Lead Name','@ldnam')??'Unnamed lead';
          const stage=getFieldLabel(row,'Stage','@stg02')??'Lead';
          return <article key={row.id} className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_190px_190px] md:items-center"><div className="min-w-0"><p className="truncate font-medium">{title}</p><p className="mt-1 truncate text-sm text-white/55">{[getFieldValue(row,'Company','@cmp02'),getFieldValue(row,'Contact Name','@con02'),getFieldValue(row,'Email','@eml02')].filter(Boolean).join(' · ')||'No contact details yet'}</p><p className="mt-1 text-xs text-white/45">SMS consent: {getFieldLabel(row,'SMS Consent','@smsc1')??'Unknown'}</p><p className="mt-1 text-xs text-white/40">{getFieldValue(row,'Service Location','@loc02')??'Location not set'}{getFieldValue(row,'Estimated Value','@val02')?` · ${getFieldValue(row,'Estimated Value','@val02')}`:''}</p></div><label className="text-xs text-white/50">Stage<select aria-label={`Stage for ${title}`} value={LEAD_STAGES.find((item)=>item.label===stage||item.value===stage)?.value??'Lead'} onChange={(e)=>void changeStage(row,e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white">{LEAD_STAGES.map((item)=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="text-xs text-white/50">Appointment date<input aria-label={`Appointment date for ${title}`} type="date" value={inputDate(getFieldValue(row,'Appointment Date','@apptd2'))} onChange={(e)=>void saveAppointment(row,e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white" /></label></article>;
        })}</div>
      </section>
    </div>
  );
}
