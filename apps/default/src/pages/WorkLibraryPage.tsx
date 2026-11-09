import { useState } from 'react';
import { ExternalLink, FolderHeart, Plus, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useLiveNodes } from '@/hooks/use-live-nodes';
import { createNode, getFieldLabel, getFieldValue, getTitle } from '@/lib/genesis-data';
import { checkWrite, LINES_LOGOS_PROJECTS } from '@/lib/lines-logos-data';

type LibraryForm={client:string;job:string;name:string;contact:string;location:string;date:string;media:string;url:string;permission:string;notes:string;publicApproved:boolean};
const empty:LibraryForm={client:'',job:'',name:'',contact:'',location:'',date:'',media:'Photos and video',url:'',permission:'Permission pending',notes:'',publicApproved:false};

export default function WorkLibraryPage(){
 const references=useLiveNodes(LINES_LOGOS_PROJECTS.references);
 const approved=useLiveNodes(LINES_LOGOS_PROJECTS.approved);
 const [form,setForm]=useState<LibraryForm>(empty);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 async function save(event:React.FormEvent){
  event.preventDefault();
  if(form.publicApproved&&form.permission!=='Approved to share'){setError('Choose “Approved to share” as well as confirming permission before adding this to the public AI library.');return;}
  setSaving(true);setError('');
  try{
   if(form.publicApproved){
    const fields:Record<string,string>={'/text':form.job.trim()||form.client.trim(),'Job Name':form.job.trim()||form.client.trim(),'Client Display Name':form.client.trim(),'Media Type':form.media,'Reference Available':form.name||form.contact?'Yes, approved customer reference':'No reference contact'};
    const optional:[string,string][]=[['Approved Reference Name',form.name],['Approved Reference Contact',form.contact],['Location',form.location],['Approved Album URL',form.url]];
    optional.forEach(([key,value])=>{if(value.trim())fields[key]=value.trim();});
    if(form.date)fields['Completed Date']=new Date(`${form.date}T12:00:00`).toISOString();
    const result=await createNode(LINES_LOGOS_PROJECTS.approved,fields);checkWrite(result);
   }else{
    const fields:Record<string,string>={'/text':form.job.trim()||form.client.trim(),'Client Name':form.client.trim(),'Job Name':form.job.trim(),'Share Permission':form.permission,'Media Type':form.media};
    const optional:[string,string][]=[['Reference Name',form.name],['Reference Email',form.contact],['Location',form.location],['Cloud Album URL',form.url],['Permission Notes',form.notes]];
    optional.forEach(([key,value])=>{if(value.trim())fields[key]=value.trim();});
    if(form.date)fields['Work Date']=new Date(`${form.date}T12:00:00`).toISOString();
    const result=await createNode(LINES_LOGOS_PROJECTS.references,fields);checkWrite(result);
   }
   setForm(empty);await Promise.all([references.refresh(),approved.refresh()]);toast.success(form.publicApproved?'Added to the approved work library':'Saved to the reference register');
  }catch(err){setError(err instanceof Error?err.message:'The record could not be saved.');}
  finally{setSaving(false);}
 }
 const approvedRefs=approved.nodes.filter(row=>getFieldLabel(row,'Reference Available','@pubref')==='Yes, approved customer reference');
 const approvedAlbums=approved.nodes.filter(row=>Boolean(getFieldValue(row,'Approved Album URL','@puburl')));
 return <div className="space-y-7">
  <header><p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-200/70">Proof of work</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">References &amp; work albums</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">Keep every client, job, date, place, and album together. Only entries deliberately approved for sharing are added to the assistant’s public work library.</p></header>
  <div className="grid gap-4 sm:grid-cols-3"><CountCard label="Reference records" count={references.nodes.length}/><CountCard label="Approved customer references" count={approvedRefs.length}/><CountCard label="Approved albums" count={approvedAlbums.length}/></div>
  <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,.7fr)]">
   <form onSubmit={(event)=>void save(event)} className="rounded-2xl border border-white/10 bg-white/[.045] p-5 backdrop-blur-xl sm:p-6">
    <div className="mb-5 flex items-start gap-3"><span className="rounded-xl bg-amber-200/10 p-2 text-amber-100"><FolderHeart className="h-5 w-5"/></span><div><h2 className="font-semibold">Add a client or album record</h2><p className="mt-1 text-sm text-white/55">Private by default. Public AI sharing requires the separate approval box below.</p></div></div>
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="text-sm text-white/70">Client or business name<input required value={form.client} onChange={e=>setForm({...form,client:e.target.value})} className="field-input mt-1"/></label>
     <label className="text-sm text-white/70">Job name<input value={form.job} onChange={e=>setForm({...form,job:e.target.value})} className="field-input mt-1"/></label>
     <label className="text-sm text-white/70">Reference name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="field-input mt-1"/></label>
     <label className="text-sm text-white/70">Approved contact email or phone<input value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} className="field-input mt-1"/></label>
     <label className="text-sm text-white/70">Work location<input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} className="field-input mt-1"/></label>
     <label className="text-sm text-white/70">Work date<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="field-input mt-1"/></label>
     <label className="text-sm text-white/70">Photos or video<select value={form.media} onChange={e=>setForm({...form,media:e.target.value})} className="field-input mt-1"><option>Photos</option><option>Video</option><option>Photos and video</option></select></label>
     <label className="text-sm text-white/70">Share permission<select value={form.permission} onChange={e=>setForm({...form,permission:e.target.value})} className="field-input mt-1"><option>Permission pending</option><option>Approved to share</option><option>Do not share</option></select></label>
     <label className="text-sm text-white/70 sm:col-span-2">Cloud album link<input type="url" inputMode="url" placeholder="https://…" value={form.url} onChange={e=>setForm({...form,url:e.target.value})} className="field-input mt-1"/><span className="mt-1 block text-xs text-white/40">Paste a link you control. This app stores the link, not the photos or video files.</span></label>
     <label className="text-sm text-white/70 sm:col-span-2">Permission notes<textarea rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="field-input mt-1 py-2"/></label>
    </div>
    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/10 p-4"><input type="checkbox" checked={form.publicApproved} onChange={e=>setForm({...form,publicApproved:e.target.checked})} className="mt-1 h-4 w-4 accent-cyan-300"/><span><span className="block text-sm font-medium">I have permission to share this public-facing work</span><span className="mt-1 block text-xs leading-5 text-white/50">When checked, this form saves only to the public AI library. Choose “Approved to share” above. Do not add private customer details without consent.</span></span></label>
    {error&&<p role="alert" className="mt-3 text-sm text-red-200">{error}</p>}
    <button disabled={saving} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 font-semibold text-slate-950 disabled:opacity-50"><Plus className="h-4 w-4"/>{saving?'Saving…':'Save work record'}</button>
   </form>
   <aside className="space-y-4"><section className="rounded-2xl border border-cyan-200/15 bg-cyan-200/[.04] p-5"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-cyan-100"/><div><h2 className="font-semibold">Permission before sharing</h2><p className="mt-2 text-sm leading-6 text-white/55">The assistant can only use the separate approved library. A private reference entry never becomes public just because it has an album link.</p></div></div></section>
    <section className="rounded-2xl border border-white/10 bg-white/[.04] p-5"><h2 className="font-semibold">What is ready to share</h2>{approved.nodes.length===0?<p className="mt-3 text-sm leading-6 text-white/55">No approved work has been added yet. The assistant will say when it has fewer than three approved references rather than inventing names or albums.</p>:<div className="mt-3 space-y-3">{approved.nodes.map(row=>{const url=getFieldValue(row,'Approved Album URL','@puburl');return <article key={row.id} className="rounded-xl border border-white/8 bg-black/10 p-3"><p className="font-medium">{getTitle(row,'Job Name','@jobpub')??'Approved work'}</p><p className="mt-1 text-sm text-white/50">{getFieldValue(row,'Client Display Name','@clpubl')??'Client name not listed'} · {getFieldValue(row,'Location','@publoc')??'Location not listed'}</p>{url&&<a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm text-cyan-100 underline underline-offset-4"><ExternalLink className="h-4 w-4"/>Open approved album</a>}</article>})}</div>}</section></aside>
  </section>
  <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.04]"><div className="border-b border-white/10 p-5"><h2 className="font-semibold">Reference and album records</h2><p className="mt-1 text-sm text-white/50">{references.nodes.length} private register entr{references.nodes.length===1?'y':'ies'} · all permission states shown</p></div>{references.loading?<div className="p-5" aria-busy="true"><div className="h-20 animate-pulse rounded-xl bg-white/5"/></div>:references.error&&references.updatedAt==null?<p role="alert" className="p-5 text-sm text-red-100">Reference records could not be loaded. <button onClick={()=>void references.refresh()} className="underline">Try again</button></p>:references.nodes.length===0?<p className="p-7 text-center text-sm text-white/55">No reference details are on file yet.</p>:<div className="divide-y divide-white/8">{references.nodes.map(row=><article key={row.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate font-medium">{getTitle(row,'Job Name','Client Name')??'Work record'}</p><p className="mt-1 truncate text-sm text-white/55">{getFieldValue(row,'Client Name','@client')??'Client not listed'} · {getFieldValue(row,'Location','@locatn')??'Location not listed'} · {getFieldValue(row,'Work Date','@workdt')?.slice(0,10)??'Date not listed'}</p><p className="mt-1 text-xs text-white/45">{getFieldValue(row,'Reference Name','@refnam')??'No reference name'} · {getFieldValue(row,'Reference Email','@refema')??getFieldValue(row,'Reference Phone','@refpho')??'No contact'}</p></div><div className="flex items-center gap-3"><span className={`rounded-full border px-3 py-1 text-xs ${getFieldLabel(row,'Share Permission','@share')==='Approved to share'?'border-emerald-200/20 text-emerald-100':'border-amber-100/20 text-amber-100'}`}>{getFieldLabel(row,'Share Permission','@share')??'Permission pending'}</span>{getFieldValue(row,'Cloud Album URL','@album')&&<a href={getFieldValue(row,'Cloud Album URL','@album')??''} target="_blank" rel="noreferrer" aria-label="Open cloud album" className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/10 text-white/70 hover:bg-white/10"><ExternalLink className="h-4 w-4"/></a>}</div></article>)}</div>}</section>
 </div>;
}
function CountCard({label,count}:{label:string;count:number}){return <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><p className="text-sm text-white/55">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{count}</p></div>}
