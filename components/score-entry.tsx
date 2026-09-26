'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ScoreGame } from '@/lib/scores';
export function ScoreEntry({players,games,refresh}:{players:{id:string;name:string}[];games:ScoreGame[];refresh:()=>Promise<void>}) {
  const blank=()=>({id:`game_${crypto.randomUUID()}`,round:'',type:'Round Robin',playerIds1:['',''],playerIds2:['',''],score1:'',score2:'',completed:true,edit:false});
  const [form,setForm]=useState<ReturnType<typeof blank>|null>(null);
  const [pending,setPending]=useState(false); const [message,setMessage]=useState('');
  async function submit(e:React.FormEvent) {
    e.preventDefault(); if(!form || pending)return; setPending(true);setMessage('');
    try { const r=await fetch('/api/scores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,score1:Number(form.score1),score2:Number(form.score2)})});const data=await r.json();if(!r.ok)throw new Error(data.error);setMessage(form.edit?'Game updated.':'Score saved.');setForm(null);await refresh(); }
    catch(e){setMessage(e instanceof Error?e.message:'Could not save score.');} finally{setPending(false);}
  }
  return <section id="scores" className="mt-10 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
    <div className="flex flex-wrap items-center justify-between gap-4"><h3 className="text-2xl font-black">Record scores</h3><Button onClick={()=>{setForm(blank());setMessage('');}} disabled={pending}>Add game score</Button></div>
    <p className="mt-3 text-base text-slate-600">Anyone can enter or correct a game. Enter each game once; qualifying scores update both partners’ individual standings. Record each finals game separately.</p>
    {message && <p role="status" className="mt-4 rounded-lg bg-blue-50 p-3">{message}</p>}
    {form && <form onSubmit={submit} className="mt-6 space-y-5">
      <h4 className="text-lg font-bold">{form.edit?'Edit game':'New game'}</h4>
      <label className="block">Round / game label<Input required maxLength={60} value={form.round} placeholder="e.g. Round 1, Court 2" onChange={e=>setForm({...form,round:e.target.value})}/></label>
      <div><span id="score-type-label">Stage</span><Select value={form.type} onValueChange={type=>setForm({...form,type})}><SelectTrigger aria-labelledby="score-type-label" className="w-full"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Round Robin">Qualifying</SelectItem><SelectItem value="Finals">Finals</SelectItem></SelectContent></Select></div>
      <div className="grid gap-6 sm:grid-cols-2">{(['playerIds1','playerIds2'] as const).map((key,side)=><fieldset key={key} className="space-y-3 rounded-xl bg-slate-50 p-4"><legend className="font-bold">Team {side+1}</legend>{[0,1].map(index=><div key={index}><span id={`${key}-${index}`}>Player {index+1}</span><Select value={form[key][index]} onValueChange={id=>{const ids=[...form[key]];ids[index]=id;setForm({...form,[key]:ids});}}><SelectTrigger aria-labelledby={`${key}-${index}`} className="w-full"><SelectValue placeholder="Choose player"/></SelectTrigger><SelectContent>{players.map(p=><SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>)}<label className="block">Score<Input type="number" required min={0} max={99} step={1} value={side===0?form.score1:form.score2} onChange={e=>setForm({...form,[side===0?'score1':'score2']:e.target.value})}/></label></fieldset>)}</div>
      {form.edit && <div><span id="score-status-label">Status</span><Select value={form.completed?'counted':'void'} onValueChange={v=>setForm({...form,completed:v==='counted'})}><SelectTrigger aria-labelledby="score-status-label"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="counted">Count this game</SelectItem><SelectItem value="void">Void / entered by mistake</SelectItem></SelectContent></Select><p className="mt-2 text-sm text-slate-600">Voided games stay in the history but do not count toward standings.</p></div>}
      <div className="flex gap-3"><Button disabled={pending} type="submit">{pending?'Saving…':form.edit?'Save correction':'Save score'}</Button><Button variant="outline" type="button" disabled={pending} onClick={()=>setForm(null)}>Cancel</Button></div>
    </form>}
    <div className="mt-6 space-y-3"><h4 className="font-bold">Recorded games</h4>{!games.length && <p className="text-slate-500">No scores recorded yet.</p>}{games.slice().reverse().map(g=><article key={g.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><div className="min-w-0"><p className="text-sm text-slate-600">{g.round} · {g.type==='Finals'?'Finals':'Qualifying'}{!g.completed?' · Voided':''}</p><p className="mt-1 font-bold break-words">{g.team1} — {g.score1}</p><p className="font-bold break-words">{g.team2} — {g.score2}</p></div><Button variant="outline" disabled={pending} onClick={()=>{setForm({...g,score1:String(g.score1),score2:String(g.score2),edit:true});setMessage('');document.getElementById('scores')?.scrollIntoView({behavior:'smooth'});}}>Edit</Button></article>)}</div>
  </section>;
}
