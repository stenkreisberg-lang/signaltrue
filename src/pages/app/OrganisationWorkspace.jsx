import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { PageHeader } from '../../components/app/AppShell';

const id = value => String(value || '');
const input = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';
const action = 'rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';

function Hierarchy({ teams, people, selected, onSelect }) {
  const known = new Set(teams.map(t => t.id));
  const children = parent => teams.filter(t => (known.has(t.parentTeamId) ? t.parentTeamId : null) === parent);
  const render = (team, seen = new Set(), level = 0) => {
    if (seen.has(team.id)) return null;
    const next = new Set(seen);
    next.add(team.id);
    const manager = people.find(p => p.id === team.formalManagerUserId);
    return (
      <div key={team.id} className={level > 0 ? 'ml-4 border-l border-slate-200 pl-3' : ''}>
        <button type="button" onClick={() => onSelect(team.id)}
          className={'mb-2 w-full rounded-lg border p-3 text-left transition ' +
            (selected === team.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50')}>
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-slate-900">{team.name}</span>
            <span className="text-xs text-slate-500">{team.memberCount} employees</span>
          </span>
          <span className="mt-1 block text-xs text-slate-600">
            {manager ? 'Formal manager: ' + manager.name : 'Formal manager not verified'}
            {' · '}
            {team.verifiedAt ? 'HR-reviewed structure' : 'Structure needs verification'}
          </span>
        </button>
        {children(team.id).map(child => render(child, next, level + 1))}
      </div>
    );
  };
  return <div>{children(null).map(team => render(team))}</div>;
}

export default function OrganisationWorkspace() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState('');
  const [personId, setPersonId] = useState('');
  const [personTeam, setPersonTeam] = useState('');
  const [personManager, setPersonManager] = useState('');
  const [parent, setParent] = useState('');
  const [formalManager, setFormalManager] = useState('');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const response = await api.get('/organisation-structure');
      setData(response.data);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Organisation structure unavailable');
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const teams = data?.teams || [];
  const people = data?.people || [];
  const team = teams.find(t => t.id === selected);
  const person = people.find(p => p.id === personId);
  useEffect(() => {
    if (!team) return;
    setParent(team.parentTeamId || '');
    setFormalManager(team.formalManagerUserId || '');
  }, [selected, data]);
  useEffect(() => {
    if (!person) return;
    setPersonTeam(person.teamId || '');
    setPersonManager(person.managerUserId || '');
  }, [personId, data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter(p => !q || [p.name, p.email, p.directoryDepartment].some(v => String(v || '').toLowerCase().includes(q)));
  }, [people, search]);
  const execute = async (task, message) => {
    setBusy(true); setError(''); setNotice('');
    try { await task(); await refresh(); setNotice(message); }
    catch (e) { setError(e.response?.data?.message || 'Change could not be saved'); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="HR / ORGANISATION" title="Organisation & teams"
        description="Verify the company structure, correct reporting lines and appoint managers. Organisation details are separate from private work-pattern measurements."
        action={<Link to="/app/admin/manager-reporting" className={action}>Manager access</Link>} />
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      {!data ? <div className="app-panel">Loading the verified workforce and teams…</div> : <>
        <div className="grid gap-3 md:grid-cols-4">
          {[
            ['Employees', data.summary.employees],
            ['Teams', data.summary.teams],
            ['Accounts to claim', data.summary.pendingAccounts],
            ['Unverified teams', data.summary.unverifiedTeams],
          ].map(([label, value]) => <div key={label} className="app-panel">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          </div>)}
        </div>
        <div className="app-panel border-amber-200 bg-amber-50">
          <p className="font-semibold">An organisational chart is not a communication map.</p>
          <p className="mt-1 text-sm">Reporting lines are verified by HR. Microsoft Teams channels or frequent meeting organisers never establish manager permissions.
            A team needs at least {data.organisation.minimum} contributors and sufficient source coverage before work-pattern metrics can be shown.
            <Link to="/app/signal-coverage" className="ml-1 underline">Check data coverage</Link>.
          </p>
        </div>
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <section className="app-panel space-y-3" aria-label="Formal organisation structure">
            <h2 className="text-xl font-bold">Formal structure</h2>
            <p className="text-sm text-slate-600">Choose a team to verify its department and manager.</p>
            <Hierarchy teams={teams} people={people} selected={selected} onSelect={setSelected} />
            {!teams.length && <p className="text-sm text-slate-600">No active teams. Review the employee import.</p>}
          </section>
          <section className="app-panel space-y-4" aria-label="Verify team structure">
            <h2 className="text-xl font-bold">Verify a team</h2>
            {team ? <>
              <p className="font-semibold">{team.name}</p>
              <p className="text-sm text-slate-600">{team.memberCount} active workforce records. {team.measurementStatus}.</p>
              <label className="block text-sm font-semibold">Parent department or team
                <select className={input} value={parent} onChange={e => setParent(e.target.value)}>
                  <option value="">Top-level team</option>
                  {teams.filter(t => t.id !== team.id).map(t =>
                    <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold">Formal reporting manager
                <select className={input} value={formalManager} onChange={e => setFormalManager(e.target.value)}>
                  <option value="">Not verified yet</option>
                  {people.map(p => <option key={p.id} value={p.id}>{p.name} · {p.email}</option>)}
                </select>
              </label>
              <button type="button" className={action} disabled={busy} onClick={() => execute(
                () => api.patch('/organisation-structure/teams/' + team.id,
                  { parentTeamId: parent || null, formalManagerUserId: formalManager || null }),
                'Team structure verified by HR.'
              )}>Save verified structure</button>
              <p className="text-xs text-slate-500">Assigning a formal manager does not give them SignalTrue reporting access.
                <Link className="ml-1 underline" to="/app/admin/manager-reporting">Approve access separately</Link>.
              </p>
            </> : <p className="text-sm text-slate-600">Select a team from the organisation tree.</p>}
          </section>
        </div>
        <section className="app-panel space-y-3" aria-label="HR employee mapping">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-xl font-bold">Employee mapping</h2>
              <p className="text-sm text-slate-600">Verify imported employees. Ex-employees are excluded from the active roster.</p></div>
            <input className={input + ' max-w-sm'} aria-label="Search employees"
              placeholder="Search employee or department" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg border">
            {filtered.map(p => <button key={p.id} type="button" onClick={() => setPersonId(p.id)}
              className={'flex w-full flex-wrap justify-between gap-3 border-b p-3 text-left text-sm ' +
                (personId === p.id ? 'bg-blue-50' : 'hover:bg-slate-50')}>
              <span><strong>{p.name}</strong><span className="ml-2 text-slate-600">{p.email}</span></span>
              <span className="text-xs text-slate-500">{teams.find(t => t.id === p.teamId)?.name || 'Unmapped'} · {p.accountStatus} · {p.verifiedTeam ? 'HR verified' : 'Directory mapping'}</span>
            </button>)}
          </div>
          {person && <div className="grid gap-3 rounded-lg border bg-slate-50 p-4 md:grid-cols-3">
            <div className="md:col-span-3"><strong>{person.name}</strong> · Directory department: {person.directoryDepartment || 'Not provided'}</div>
            <label className="text-sm font-semibold">Verified team
              <select className={input} value={personTeam} onChange={e => setPersonTeam(e.target.value)}>
                <option value="">Choose team</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">Reports to
              <select className={input} value={personManager} onChange={e => setPersonManager(e.target.value)}>
                <option value="">Unknown / no manager</option>
                {people.filter(p => p.id !== person.id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <div className="flex items-end"><button disabled={!personTeam || busy} className={action}
              onClick={() => execute(() => api.patch('/organisation-structure/people/' + person.id,
                { teamId: personTeam, managerUserId: personManager || null }), 'Employee reporting line verified by HR.')}>
              Save employee mapping</button></div>
            <p className="md:col-span-3 text-xs text-slate-500">
              Changes take effect now and are retained during subsequent directory syncs. Earlier work events keep their original historical team attribution.
            </p>
          </div>}
        </section>
      </>}
    </div>
  );
}
