import React,{useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {LineChart,Line,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,ReferenceLine} from 'recharts';
import api from '../../utils/api';
export default function ManagerTeamDashboard(){
 const [teams,setTeams]=useState([]),[team,setTeam]=useState(''),[report,setReport]=useState(null),[weeks,setWeeks]=useState(13);
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [title,setTitle]=useState(''),[hypothesis,setHypothesis]=useState(''),[direction,setDirection]=useState('decrease');
 const [email,setEmail]=useState(true);
 useEffect(()=>{api.get('/manager-intelligence/me/teams').then(r=>{setTeams(r.data.teams||[]);setTeam(r.data.teams?.[0]?.teamId||'');setEmail(r.data.teams?.[0]?.weeklyEmailEnabled!==false)}).catch(()=>setError('Unable to verify manager appointment'))},[]);
 const reload=()=>{if(!team)return;api.get('/manager-intelligence/teams/'+team+'/trends').then(r=>{setReport(r.data);setError('')}).catch(e=>{setReport(null);setError(e.response?.data?.message||'Not authorized')})};
 useEffect(()=>{setReport(null);reload()},[team]);
 const submit=async()=>{setBusy(true);try{await api.post('/manager-intelligence/teams/'+team+'/actions',{title,hypothesis,direction});
 setTitle('');setHypothesis('');setMessage('Action recorded; check results after 14 and 28 days.');reload()}catch(e){setError(e.response?.data?.message||'Action not saved')}finally{setBusy(false)}};
 const review=async id=>{setBusy(true);try{const x=await api.post('/manager-intelligence/teams/'+team+'/actions/'+id+'/review');setMessage('Follow-up: '+x.data.status+' (observed association, not causal proof).');reload()}catch(e){setError(e.response?.data?.message||'Review unavailable')}finally{setBusy(false)}};
 const setPref=async checked=>{setEmail(checked);try{await api.patch('/manager-intelligence/me/preferences',{weeklyEmailEnabled:checked})}catch{setEmail(!checked);setError('Preference not saved')}};
 const date=s=>s?new Date(s).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'';
 const points=(report?.points||[]).slice(-weeks).map(p=>({...p,label:date(p.date)}));
 return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="mx-auto max-w-6xl space-y-5">
 <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold tracking-widest text-blue-700">SIGNALTRUE / TEAM MANAGER</p><h1 className="mt-2 text-3xl font-bold">My team intelligence</h1><p className="mt-2 text-sm text-slate-600">Private, aggregated work-pattern evidence and management actions.</p></div><Link className="rounded-lg border bg-white px-4 py-2 text-sm" to="/dashboard">Back to account</Link></header>
 {error&&<p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
 {message&&<p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
 {!teams.length?<section className="rounded-xl border bg-white p-8"><h2 className="font-bold">No active manager appointment</h2><p className="mt-2 text-sm">Ask HR to appoint you and use the verified invitation.</p></section>:
 <>
 <section className="flex flex-wrap gap-4 rounded-xl border bg-white p-4"><label className="text-sm font-bold">My authorized team <select value={team} onChange={e=>{setTeam(e.target.value);setEmail(teams.find(t=>t.teamId===e.target.value)?.weeklyEmailEnabled!==false)}} className="ml-2 rounded border p-2">{teams.map(t=><option key={t.teamId} value={t.teamId}>{t.name}</option>)}</select></label><label className="ml-auto flex items-center gap-2 text-sm"><input type="checkbox" checked={email} onChange={e=>setPref(e.target.checked)}/> Weekly digest</label></section>
 {report?.eligible===false?<section className="rounded-xl border border-amber-200 bg-white p-6"><h2 className="font-bold">Insufficient privacy-eligible evidence</h2><p className="mt-2 text-sm">{report.reason}. No statistics, individual records or inferred stable status are disclosed.</p></section>:
 report?.eligible&&<>
 <div className="grid gap-4 sm:grid-cols-3">{[['Latest complete week',report.current],['Earlier six-week median',report.baseline],['Evidence gate',report.minimum+' mapped people minimum']].map(([k,v])=><div key={k} className="rounded-xl border bg-white p-5"><p className="text-xs text-slate-500">{k}</p><p className="mt-2 text-2xl font-bold">{v??'Not enough history'}</p></div>)}</div>
 <section className="rounded-xl border bg-white p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Meeting activity over time</h2><div className="flex gap-2">{[[4,'1M'],[13,'3M'],[26,'6M']].map(([n,k])=><button key={k} aria-pressed={weeks===n} onClick={()=>setWeeks(n)} className={'rounded-md px-3 py-2 text-sm '+(weeks===n?'bg-slate-900 text-white':'bg-slate-100')}>{k}</button>)}</div></div>
 <p className="my-3 text-sm text-slate-600">X-axis: completed week · Y-axis: meeting instances per mapped team contributor. No individual attendance is inferred.</p>
 <div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={points}><CartesianGrid strokeDasharray="3 4" stroke="#e2e8f0"/><XAxis dataKey="label" tick={{fontSize:10}} minTickGap={22}/><YAxis domain={[0,'auto']} width={40}/><Tooltip formatter={v=>[v,'Meeting instances per contributor']}/>{report.baseline!=null&&<ReferenceLine y={report.baseline} stroke="#64748b" strokeDasharray="5 4"/>}<Line dataKey="value" type="linear" connectNulls={false} stroke="#2563eb" strokeWidth={3} dot={{r:2}}/></LineChart></ResponsiveContainer></div>
 <p className="mt-3 text-xs text-slate-500">{report.methodology}. Missing measurements remain gaps. These patterns are not employee health or productivity scores.</p></section>
 <section className="rounded-xl border bg-white p-5"><h2 className="text-xl font-bold">Record a management decision</h2><p className="mt-2 text-sm text-slate-600">Create a work-design action and review comparable measurements after 14 and 28 days.</p>
 <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Decision<input maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} className="mt-1 block w-full rounded-lg border p-3" placeholder="Reduce recurring status meetings"/></label><label className="text-sm font-semibold">Expected direction<select value={direction} onChange={e=>setDirection(e.target.value)} className="mt-1 block w-full rounded-lg border p-3"><option value="decrease">Decrease</option><option value="increase">Increase</option><option value="stabilize">Stabilize</option></select></label></div>
 <label className="mt-3 block text-sm font-semibold">Context and hypothesis<textarea rows={3} maxLength={1000} value={hypothesis} onChange={e=>setHypothesis(e.target.value)} className="mt-1 block w-full rounded-lg border p-3"/></label>
 <button disabled={!title.trim()||busy} onClick={submit} className="mt-3 rounded-lg bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-50">Save action and review dates</button></section>
 <section className="rounded-xl border bg-white p-5"><h2 className="text-xl font-bold">Actions and outcomes</h2>{report.actions?.length?report.actions.map(a=><div key={a.id} className="mt-3 flex flex-wrap justify-between gap-2 rounded-lg border p-4"><div><p className="font-bold">{a.title}</p><p className="text-xs text-slate-600">Day 14: {date(a.due14)} · Day 28: {date(a.due28)} · Outcome: {a.outcome28?.status||a.outcome14?.status||'Pending'}</p></div><button onClick={()=>review(a.id)} disabled={busy} className="rounded-lg border px-3 py-2 text-sm font-semibold">Check follow-up</button></div>):<p className="mt-3 text-sm text-slate-600">No actions recorded yet.</p>}</section>
 </>}
 </>}
 <p className="text-xs text-slate-500">Each request checks the active HR-approved manager/team assignment. Unauthorized or small-cohort data is not shown.</p>
 </div></main>;
}
