import { adminTranslator } from '../../utils/adminLanguage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { PageHeader } from '../../components/app/AppShell';

const emptyPeople = [];
const input = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';
const action =
  'rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';

function Hierarchy({ teams, people, selected, onSelect, t }) {
  const known = new Set(teams.map((t) => t.id));
  const children = (parent) =>
    teams.filter((t) => (known.has(t.parentTeamId) ? t.parentTeamId : null) === parent);
  const render = (team, seen = new Set(), level = 0) => {
    if (seen.has(team.id)) return null;
    const next = new Set(seen);
    next.add(team.id);
    const manager = people.find((p) => p.id === team.formalManagerUserId);
    return (
      <div key={team.id} className={level > 0 ? 'ml-4 border-l border-slate-200 pl-3' : ''}>
        <button
          type="button"
          onClick={() => onSelect(team.id)}
          className={
            'mb-2 w-full rounded-lg border p-3 text-left transition ' +
            (selected === team.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-200 bg-white hover:bg-slate-50')
          }
        >
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-slate-900">{team.name}</span>
            <span className="text-xs text-slate-500">
              {team.memberCount} {t('employees')}
            </span>
          </span>
          <span className="mt-1 block text-xs text-slate-600">
            {manager ? t('Formal manager:') + ' ' + manager.name : t('Formal manager not verified')}
            {' · '}
            {team.verifiedAt ? t('HR-reviewed structure') : t('Structure needs verification')}
          </span>
        </button>
        {children(team.id).map((child) => render(child, next, level + 1))}
      </div>
    );
  };
  return <div>{children(null).map((team) => render(team))}</div>;
}

export default function OrganisationWorkspace({ locale = 'en' }) {
  const t = adminTranslator(locale);
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
  const [recipientEmails, setRecipientEmails] = useState([]);
  const refresh = useCallback(async () => {
    try {
      const response = await api.get('/organisation-structure');
      setData(response.data);
      setRecipientEmails(response.data.organisation?.approvedReportRecipients || []);
      setError('');
    } catch (e) {
      setError(t(e.response?.data?.message || 'Organisation structure unavailable'));
    }
  }, [t]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const teams = data?.teams || [];
  const people = data?.people || emptyPeople;
  const team = teams.find((t) => t.id === selected);
  const person = people.find((p) => p.id === personId);
  useEffect(() => {
    if (!team) return;
    setParent(team.parentTeamId || '');
    setFormalManager(team.formalManagerUserId || '');
  }, [team]);
  useEffect(() => {
    if (!person) return;
    setPersonTeam(person.teamId || '');
    setPersonManager(person.managerUserId || '');
  }, [person]);
  const eligibleRecipients = people.filter(
    (p) =>
      p.accountStatus === 'active' &&
      ['hr_admin', 'admin', 'org_admin', 'master_admin'].includes(p.role)
  );
  const saveRecipients = () =>
    execute(
      () => api.put('/organisation-structure/report-recipients', { emails: recipientEmails }),
      recipientEmails.length
        ? t('HR weekly report recipients approved.')
        : t('Weekly organisation report delivery paused.')
    );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter(
      (p) =>
        !q ||
        [p.name, p.email, p.directoryDepartment].some((v) =>
          String(v || '')
            .toLowerCase()
            .includes(q)
        )
    );
  }, [people, search]);
  const execute = async (task, message) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await task();
      await refresh();
      setNotice(message);
    } catch (e) {
      setError(t(e.response?.data?.message || 'Change could not be saved'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('HR / ORGANISATION')}
        title={t('Organisation & teams')}
        description={t(
          'Verify the company structure, correct reporting lines and appoint managers. Organisation details are separate from private work-pattern measurements.'
        )}
        action={
          <Link to="/app/admin/manager-reporting" className={action}>
            {t('Manager access')}
          </Link>
        }
      />
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
        >
          {notice}
        </p>
      )}
      {!data ? (
        <div className="app-panel">{t('Loading the verified workforce and teams…')}</div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            {[
              [t('Employees'), data.summary.employees],
              [t('Teams'), data.summary.teams],
              [t('Accounts to claim'), data.summary.pendingAccounts],
              [t('Unverified teams'), data.summary.unverifiedTeams],
            ].map(([label, value]) => (
              <div key={label} className="app-panel">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
          <div className="app-panel border-amber-200 bg-amber-50">
            <p className="font-semibold">
              {t('An organisational chart is not a communication map.')}
            </p>
            <p className="mt-1 text-sm">
              {t(
                'HR verifies reporting lines. Meeting organisers and Teams channels cannot grant manager access.'
              )}{' '}
              {t('Minimum contributors for reporting')} {data.organisation.minimum}.{' '}
              {t('Reporting also requires adequate source coverage.')}
              <Link to="/app/signal-coverage" className="ml-1 underline">
                {t('Check data coverage')}
              </Link>
              .
            </p>
          </div>
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <section
              className="app-panel space-y-3"
              aria-label={t('Formal organisation structure')}
            >
              <h2 className="text-xl font-bold">{t('Formal structure')}</h2>
              <p className="text-sm text-slate-600">
                {t('Choose a team to verify its department and manager.')}
              </p>
              <Hierarchy
                teams={teams}
                people={people}
                selected={selected}
                onSelect={setSelected}
                t={t}
              />
              {!teams.length && (
                <p className="text-sm text-slate-600">
                  {t('No active teams. Review the employee import.')}
                </p>
              )}
            </section>
            <section className="app-panel space-y-4" aria-label={t('Verify team structure')}>
              <h2 className="text-xl font-bold">{t('Verify a team')}</h2>
              {team ? (
                <>
                  <p className="font-semibold">{team.name}</p>
                  <p className="text-sm text-slate-600">
                    {t('People on the current roster')} {team.memberCount}.
                  </p>
                  <p className="text-sm text-slate-600">
                    {team.reportingEligibleBySize
                      ? t('Meets the size requirement. Source coverage must still be verified.')
                      : t(
                          'Below the minimum cohort or team reporting disabled. Analytics remain suppressed.'
                        )}
                  </p>
                  <Link className="text-sm font-semibold underline" to={'/app/insights/' + team.id}>
                    {t('Open team investigation')}
                  </Link>
                  <label className="block text-sm font-semibold">
                    {t('Parent department or team')}
                    <select
                      className={input}
                      value={parent}
                      onChange={(e) => setParent(e.target.value)}
                    >
                      <option value="">{t('Top-level team')}</option>
                      {teams
                        .filter((t) => t.id !== team.id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="block text-sm font-semibold">
                    {t('Formal reporting manager')}
                    <select
                      className={input}
                      value={formalManager}
                      onChange={(e) => setFormalManager(e.target.value)}
                    >
                      <option value="">{t('Not verified yet')}</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {p.email}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className={action}
                    disabled={busy}
                    onClick={() =>
                      execute(
                        () =>
                          api.patch('/organisation-structure/teams/' + team.id, {
                            parentTeamId: parent || null,
                            formalManagerUserId: formalManager || null,
                          }),
                        t('Team structure verified by HR.')
                      )
                    }
                  >
                    {t('Save verified structure')}
                  </button>
                  <p className="text-xs text-slate-500">
                    {t(
                      'Assigning a formal manager does not give them SignalTrue reporting access.'
                    )}
                    <Link className="ml-1 underline" to="/app/admin/manager-reporting">
                      {t('Approve access separately')}
                    </Link>
                    .
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-600">
                  {t('Select a team from the organisation tree.')}
                </p>
              )}
            </section>
          </div>
          <section
            className="app-panel"
            aria-label={t('Formal organisation compared with coordination patterns')}
          >
            <h2 className="text-xl font-bold">{t('Formal structure vs. how teams coordinate')}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {t(
                'Formal reporting relationships come from HR verification. A separate work-network view can show privacy-eligible links based on meetings and available message metadata. It does not infer who reports to whom, and an absent link does not mean that teams never collaborate.'
              )}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/app/work-network"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                {t('Review measured cross-team coordination')}
              </Link>
              <Link
                to="/app/signal-coverage"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                {t('Check messaging and calendar coverage')}
              </Link>
            </div>
          </section>
          <section className="app-panel space-y-3" aria-label={t('HR weekly report recipients')}>
            <h2 className="text-xl font-bold">{t('Who receives the weekly HR report?')}</h2>
            <p className="text-sm text-slate-600">
              {t(
                'Choose the active administrators who receive the weekly organisation report. Team managers receive separate reports for the teams they have accepted.'
              )}
              {data.organisation.weeklyQualityCopyEnabled && (
                <>
                  {' '}
                  {t(
                    'When the organisation report is sent, the designated SignalTrue administrator also receives a copy for quality review.'
                  )}
                </>
              )}
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              {eligibleRecipients.map((person) => (
                <label
                  key={person.id}
                  className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={recipientEmails.includes(person.email.toLowerCase())}
                    onChange={(event) => {
                      const email = person.email.toLowerCase();
                      setRecipientEmails((previous) =>
                        event.target.checked
                          ? [...new Set([...previous, email])]
                          : previous.filter((value) => value !== email)
                      );
                    }}
                  />
                  <span>
                    <strong>{person.name}</strong>
                    <span className="block text-xs text-slate-600">{person.email}</span>
                  </span>
                </label>
              ))}
            </div>
            {!eligibleRecipients.length && (
              <p className="text-sm text-amber-800">
                {t(
                  'No active administrative accounts are eligible. Confirm HR access before enabling delivery.'
                )}
              </p>
            )}
            <p className="text-xs text-slate-600">
              {data.organisation.recipientsReviewedAt
                ? t('Recipients reviewed') +
                  ' ' +
                  new Date(data.organisation.recipientsReviewedAt).toLocaleDateString(
                    locale === 'et' ? 'et-EE' : 'en-GB'
                  )
                : t(
                    'Not explicitly reviewed. Delivery falls back to active HR administrator accounts only.'
                  )}{' '}
              {t('Saving an empty approved list pauses automatic organisation email.')}
            </p>
            <button type="button" className={action} disabled={busy} onClick={saveRecipients}>
              {t('Save approved recipients')}
            </button>
          </section>
          <section className="app-panel space-y-3" aria-label={t('HR employee mapping')}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{t('Employee mapping')}</h2>
                <p className="text-sm text-slate-600">
                  {t('Review imported employees. This roster excludes accounts marked inactive.')}
                </p>
              </div>
              <input
                className={input + ' max-w-sm'}
                aria-label={t('Search employees')}
                placeholder={t('Search employee or department')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg border">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPersonId(p.id)}
                  className={
                    'flex w-full flex-wrap justify-between gap-3 border-b p-3 text-left text-sm ' +
                    (personId === p.id ? 'bg-blue-50' : 'hover:bg-slate-50')
                  }
                >
                  <span>
                    <strong>{p.name}</strong>
                    <span className="ml-2 text-slate-600">{p.email}</span>
                  </span>
                  <span className="text-xs text-slate-500">
                    {teams.find((t) => t.id === p.teamId)?.name || t('Unmapped')} ·{' '}
                    {t(p.accountStatus)} ·{' '}
                    {p.verifiedTeam ? t('HR verified') : t('Directory mapping')}
                  </span>
                </button>
              ))}
            </div>
            {person && (
              <div className="grid gap-3 rounded-lg border bg-slate-50 p-4 md:grid-cols-3">
                <div className="md:col-span-3">
                  <strong>{person.name}</strong> {' · '}
                  {t('Directory department')} {person.directoryDepartment || t('Not provided')}
                </div>
                <label className="text-sm font-semibold">
                  {t('Verified team')}
                  <select
                    className={input}
                    value={personTeam}
                    onChange={(e) => setPersonTeam(e.target.value)}
                  >
                    <option value="">{t('Choose team')}</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold">
                  {t('Reports to')}
                  <select
                    className={input}
                    value={personManager}
                    onChange={(e) => setPersonManager(e.target.value)}
                  >
                    <option value="">{t('Unknown / no manager')}</option>
                    {people
                      .filter((p) => p.id !== person.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="flex items-end">
                  <button
                    disabled={!personTeam || busy}
                    className={action}
                    onClick={() =>
                      execute(
                        () =>
                          api.patch('/organisation-structure/people/' + person.id, {
                            teamId: personTeam,
                            managerUserId: personManager || null,
                          }),
                        t('Employee reporting line verified by HR.')
                      )
                    }
                  >
                    {t('Save employee mapping')}
                  </button>
                </div>
                <p className="md:col-span-3 text-xs text-slate-500">
                  {t(
                    'Changes take effect now and are retained during subsequent directory syncs. Earlier work events keep their original historical team attribution.'
                  )}
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
