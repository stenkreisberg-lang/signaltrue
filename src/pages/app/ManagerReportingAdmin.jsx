import React,{useCallback,useEffect,useState} from 'react';
import AppShell,{PageHeader} from '../../components/app/AppShell';
import api from '../../utils/api';
const user=()=>{try{return JSON.parse(localStorage.getItem('user')||'null')}catch{return null}};
export default function ManagerReportingAdmin(){
 const [data,setData]=useState(null),[person,setPerson]=useState(''),[team,setTeam]=useState('');
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{try{const r=await api.get('/manager-intelligence/admin/directory');setData(r.data);setError('')}catch(e){setError(e.response?.data?.message||'Unable to load manager assignments')}},[]);
 useEffect(()=>{load()},[load]);
 const run=async(task,success)=>{setBusy(true);setNotice('');setError('');try{await task();setNotice(success);await load()}catch(e){setError(e.response?.data?.message||'Unable to complete request')}finally{setBusy(false)}};
 const appoint=()=>run(()=>api.post('/manager-intelligence/admin/assignments',{managerUserId:person,teamId:team}),'Assignment approved. Now send the invitation.');
 const send=id=>run(()=>api.post('/manager-intelligence/admin/assignments/'+id+'/invite'),'Invitation sent to the approved company account.');
 const revoke=id=>run(()=>api.post('/manager-intelligence/admin/assignments/'+id+'/revoke'),'Access revoked. New API requests will be denied.');
 const setExport=(id,enabled)=>run(()=>api.patch('/manager-intelligence/admin/assignments/'+id+'/permissions',{exportEnabled:enabled}),enabled?'Restricted PDF export enabled':'Restricted PDF export disabled');
 return <AppShell user={user()} section="Manager reporting"><PageHeader eyebrow="ADMIN · ACCESS MANAGEMENT" title="Team manager reporting"
 description="HR controls every appointment. Inviting never grants dashboard access until the exact employee accepts."/>
 <div className="app-panel space-y-5">
  <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">Team data needs at least {data?.minimum||8} mapped contributors in every displayed week. Appointments and subscriptions are separate. Manager email remains subject to production release safeguards.</div>
  {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
  {notice&&<p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-900">{notice}</p>}
  <h2 className="text-lg font-bold">1. Approve a manager</h2>
  <div className="grid gap-4 md:grid-cols-2">
   <label className="text-sm font-semibold">Verified organization employee
    <select className="mt-2 w-full rounded-lg border border-slate-300 p-3" value={person} onChange={e=>setPerson(e.target.value)}>
     <option value="">Choose an employee</option>{(data?.users||[]).map(u=><option key={u.id} value={u.id}>{u.name||u.email} · {u.email}</option>)}
    </select></label>
   <label className="text-sm font-semibold">Exact authorized team
    <select className="mt-2 w-full rounded-lg border border-slate-300 p-3" value={team} onChange={e=>setTeam(e.target.value)}>
     <option value="">Choose a team</option>{(data?.teams||[]).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
    </select></label>
  </div>
  <button type="button" disabled={!person||!team||busy} onClick={appoint} className="rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-50">Approve scoped appointment</button>
  <hr className="border-slate-200"/>
  <h2 className="text-lg font-bold">2. Invitations and current authorizations</h2>
  <p className="text-sm text-slate-600">Send a seven-day, single-use invitation. A manager must authenticate with the exact nominated account to activate team access.</p>
  {(data?.assignments||[]).length===0?<p className="text-sm text-slate-500">No manager appointments yet.</p>:<div className="space-y-3">
   {data.assignments.map(a=>{const u=data.users.find(v=>v.id===a.managerUserId),t=data.teams.find(v=>v.id===a.teamId);
   return <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4">
    <div><p className="font-semibold">{u?.name||u?.email||'Previously assigned user'} · {t?.name||'Inactive team'}</p>
     <p className="mt-1 text-xs text-slate-600">Status: {a.status} · Weekly email: {a.weeklyEmailEnabled?'Enabled after activation':'Off'}</p></div>
    <div className="flex gap-2">
     {['pending','invited'].includes(a.status)&&<button type="button" disabled={busy} onClick={()=>send(a.id)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold">Send invitation</button>}
     {a.status==='active'&&<button type="button" disabled={busy} onClick={()=>setExport(a.id,!a.exportEnabled)}
      className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-bold">{a.exportEnabled?'Disable PDF':'Allow scoped PDF'}</button>}
     {a.status!=='revoked'&&<button type="button" disabled={busy} onClick={()=>revoke(a.id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700">Revoke</button>}
    </div>
   </div>})}</div>}
  <p className="text-xs text-slate-500">Revocation blocks subsequent reads immediately. No raw communication content is available here.</p>
 </div></AppShell>;
}
