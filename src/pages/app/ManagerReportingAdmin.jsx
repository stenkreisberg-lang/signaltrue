import React, { useCallback, useEffect, useState } from 'react';
import AppShell, { PageHeader } from '../../components/app/AppShell';
import api from '../../utils/api';

function currentUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); }
  catch { return null; }
}

const button = 'rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
const secondary = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50';
const field = 'mt-1 block w-full rounded-lg border border-slate-300 bg-white p-3 text-sm';

export default function ManagerReportingAdmin() {
  const [directory, setDirectory] = useState(null);
  const [structure, setStructure] = useState(null);
  const [person, setPerson] = useState('');
  const [team, setTeam] = useState('');
  const [weeklyEmail, setWeeklyEmail] = useState(false);
  const [allowPdf, setAllowPdf] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [adminData, orgData] = await Promise.all([
        api.get('/manager-intelligence/admin/directory'),
        api.get('/organisation-structure'),
      ]);
      setDirectory(adminData.data);
      setStructure(orgData.data);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load HR manager permissions');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (task, message) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await task();
      await load();
      setNotice(message);
      return result;
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to complete this change');
      return null;
    } finally { setBusy(false); }
  };
  const employees = directory?.users || [];
  const teams = directory?.teams || [];
  const assignments = directory?.assignments || [];
  const employee = employees.find(u => u.id === person);
  const selectedTeam = teams.find(t => t.id === team);
  const teamDetails = structure?.teams?.find(t => t.id === team);
  const existing = assignments.find(a => a.managerUserId === person &&
    a.teamId === team && !['revoked', 'declined', 'expired'].includes(a.status));
  const appoint = async () => {
    if (!confirm || existing) return;
    const result = await run(() => api.post('/manager-intelligence/admin/assignments', {
      managerUserId: person, teamId: team, weeklyEmailEnabled: weeklyEmail,
    }), 'Appointment saved. Review the assignment and send the company invitation below.');
    if (result?.data?.id) {
      setConfirm(false);
      if (allowPdf) await run(() => api.patch('/manager-intelligence/admin/assignments/' +
        result.data.id + '/permissions', { exportEnabled: true }), 'Appointment ready to invite. PDF export approved by HR.');
    }
  };
  const send = id => run(() => api.post('/manager-intelligence/admin/assignments/' + id + '/invite'),
    'Seven-day invitation sent to the nominated company email. Team access starts only after acceptance.');
  const revoke = id => run(() => api.post('/manager-intelligence/admin/assignments/' + id + '/revoke'),
    'Manager permission revoked. Subsequent team-data requests will be denied.');
  const permission = (id, fieldName, value) => run(() =>
    api.patch('/manager-intelligence/admin/assignments/' + id + '/permissions',
      { [fieldName]: value }), 'Manager permission updated.');

  return (
    <AppShell user={currentUser()} section="HR / Access">
      <div className="space-y-5">
        <PageHeader eyebrow="HR / ACCESS" title="Manager access & invitations"
          description="Approve who sees which team. Formal reporting lines do not create SignalTrue access." />
        <section className="app-panel border-blue-200">
          <h2 className="text-lg font-bold">How access works</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            {[
              ['1', 'HR selects the employee and team'],
              ['2', 'HR confirms access and email settings'],
              ['3', 'Employee claims the account if necessary and accepts a seven-day invitation'],
              ['4', 'Only that team becomes visible, subject to privacy and source coverage'],
            ].map(([n, txt]) => <div key={n} className="rounded-lg bg-slate-50 p-3 text-sm">
              <span className="mr-2 font-bold">{n}.</span>{txt}
            </div>)}
          </div>
          <p className="mt-3 text-sm text-slate-600">
            A team needs at least {directory?.minimum || 8} mapped contributors in each relevant
            reporting period. An appointment never bypasses the privacy threshold. Manager email
            also requires the separately enabled production delivery service.
          </p>
        </section>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
        <section className="app-panel space-y-4">
          <h2 className="text-lg font-bold">1. Appoint a team manager</h2>
          <p className="text-sm text-slate-600">You can invite active employees and employees imported from Microsoft who have not created a SignalTrue account yet.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold">Employee
              <select className={field} value={person} onChange={e => { setPerson(e.target.value); setConfirm(false); }}>
                <option value="">Select an employee</option>
                {employees.map(u => <option value={u.id} key={u.id}>
                  {u.name || u.email} · {u.email} {u.accountStatus === 'pending' ? '(account not claimed)' : ''}
                </option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">Authorised team
              <select className={field} value={team} onChange={e => { setTeam(e.target.value); setConfirm(false); }}>
                <option value="">Select a team</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          </div>
          {employee && selectedTeam && <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold">2. Review the invitation scope</h3>
            <p className="mt-2 text-sm">
              <strong>{employee.name || employee.email}</strong> will be offered access to
              <strong> {selectedTeam.name}</strong> only.
              The team currently has {teamDetails?.memberCount ?? 'unverified'} directory-mapped employees.
              {teamDetails?.reportingEligibleBySize === false
                ? ' Team results remain withheld until minimum cohort and source conditions are satisfied.'
                : ' Source coverage must also be sufficient before results can appear.'}
            </p>
            {employee.accountStatus === 'pending' && <p className="mt-2 text-sm font-semibold text-amber-800">
              This employee must create a password using their invitation before signing in.
            </p>}
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={weeklyEmail} onChange={e => setWeeklyEmail(e.target.checked)}/>
                Request weekly team email after acceptance
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={allowPdf} onChange={e => setAllowPdf(e.target.checked)}/>
                Permit scoped PDF downloads
              </label>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)}/>
              I have checked the nominated employee, team and requested permissions.
            </label>
            {existing && <p className="mt-2 text-sm text-amber-800">This appointment already exists. Use the controls below.</p>}
            <button type="button" className={'mt-3 ' + button} disabled={!confirm || busy || Boolean(existing)}
              onClick={appoint}>Approve manager appointment</button>
          </div>}
        </section>
        <section className="app-panel space-y-3">
          <h2 className="text-lg font-bold">3. Invitations & current authorisations</h2>
          {!assignments.length && <p className="text-sm text-slate-600">No manager appointments yet.</p>}
          {assignments.map(a => {
            const u = employees.find(x => x.id === a.managerUserId);
            const t = teams.find(x => x.id === a.teamId);
            return <div key={a.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{u?.name || u?.email || 'Previously assigned employee'} · {t?.name || 'Inactive team'}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {a.status === 'active' ? 'Accepted and active' :
                      a.status === 'invited' ? 'Invitation pending acceptance' :
                      a.status === 'pending' ? 'Approved, invitation not yet sent' :
                      a.status === 'revoked' ? 'Access revoked' : 'Access ' + a.status}
                    {a.invitedAt ? ' · Sent ' + new Date(a.invitedAt).toLocaleDateString('en-GB') : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['pending', 'invited'].includes(a.status) &&
                    <button type="button" disabled={busy} className={secondary}
                      onClick={() => send(a.id)}>{a.status === 'invited' ? 'Resend invitation' : 'Send invitation'}</button>}
                  {a.status !== 'revoked' &&
                    <button type="button" disabled={busy} className={secondary + ' text-red-700'}
                      onClick={() => revoke(a.id)}>Revoke</button>}
                </div>
              </div>
              {a.status === 'active' && <div className="mt-3 flex flex-wrap gap-5 border-t pt-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={Boolean(a.weeklyEmailEnabled)} disabled={busy}
                    onChange={e => permission(a.id, 'weeklyEmailEnabled', e.target.checked)} />
                  Weekly email subscription
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={Boolean(a.exportEnabled)} disabled={busy}
                    onChange={e => permission(a.id, 'exportEnabled', e.target.checked)} />
                  Allow scoped PDF export
                </label>
              </div>}
            </div>;
          })}
          <p className="text-xs text-slate-500">
            HR approval, invitation delivery and access acceptance are separate events. Revocation
            is enforced on every API request. No individual messages or employee rankings are available.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
