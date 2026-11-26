import React, { useCallback, useEffect, useState } from 'react';
import AppShell, { PageHeader } from '../../components/app/AppShell';
import api from '../../utils/api';

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

const button =
  'rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
const secondary =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50';
const field = 'mt-1 block w-full rounded-lg border border-slate-300 bg-white p-3 text-sm';

export default function ManagerReportingAdmin() {
  const [directory, setDirectory] = useState(null);
  const et = directory?.locale === 'et';
  const tr = (en, estonian) => (et ? estonian : en);
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
  useEffect(() => {
    load();
  }, [load]);

  const run = async (task, message) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await task();
      await load();
      setNotice(message);
      return result;
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to complete this change');
      return null;
    } finally {
      setBusy(false);
    }
  };
  const employees = directory?.users || [];
  const teams = directory?.teams || [];
  const assignments = directory?.assignments || [];
  const employee = employees.find((u) => u.id === person);
  const selectedTeam = teams.find((t) => t.id === team);
  const teamDetails = structure?.teams?.find((t) => t.id === team);
  const existing = assignments.find(
    (a) =>
      a.managerUserId === person &&
      a.teamId === team &&
      !['revoked', 'declined', 'expired'].includes(a.status)
  );
  const appoint = async () => {
    if (!confirm || existing) return;
    const result = await run(
      () =>
        api.post('/manager-intelligence/admin/assignments', {
          managerUserId: person,
          teamId: team,
          weeklyEmailEnabled: weeklyEmail,
        }),
      tr(
        'Appointment saved. Review the assignment and send the company invitation below.',
        'Tiimijuhi määramine on salvestatud. Kontrolli õigusi ja saada kutse.'
      )
    );
    if (result?.data?.id) {
      setConfirm(false);
      if (allowPdf)
        await run(
          () =>
            api.patch(
              '/manager-intelligence/admin/assignments/' + result.data.id + '/permissions',
              { exportEnabled: true }
            ),
          tr(
            'Appointment ready to invite. PDF export approved by HR.',
            'Määramine on kinnitatud. PDF-i allalaadimine on lubatud.'
          )
        );
    }
  };
  const send = (id) =>
    run(
      () => api.post('/manager-intelligence/admin/assignments/' + id + '/invite'),
      tr(
        'Seven-day invitation sent to the nominated company email. Team access starts only after acceptance.',
        'Kutse anti e-posti teenusele edastamiseks. Kutse kehtib seitse päeva. Juhi ligipääs algab pärast kutse vastuvõtmist.'
      )
    );
  const revoke = (id) =>
    run(
      () => api.post('/manager-intelligence/admin/assignments/' + id + '/revoke'),
      tr(
        'Manager permission revoked. Subsequent team-data requests will be denied.',
        'Juhi ligipääs on tühistatud.'
      )
    );
  const permission = (id, fieldName, value) =>
    run(
      () =>
        api.patch('/manager-intelligence/admin/assignments/' + id + '/permissions', {
          [fieldName]: value,
        }),
      tr('Manager permission updated.', 'Tiimijuhi õigused on uuendatud.')
    );

  return (
    <AppShell
      locale={et ? 'et' : 'en'}
      user={currentUser()}
      section={tr('HR / Access', 'HR / Ligipääs')}
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow={tr('HR / ACCESS', 'HR / LIGIPÄÄS')}
          title={tr('Manager access & invitations', 'Tiimijuhtide ligipääs ja kutsed')}
          description={tr(
            'Approve who sees which team. Formal reporting lines do not create SignalTrue access.',
            'Siin kinnitab personalijuht, kes näeb konkreetse tiimi andmeid. Organisatsiooni struktuuri lisamine üksi ligipääsu ei anna.'
          )}
        />
        <section className="app-panel border-blue-200">
          <h2 className="text-lg font-bold">
            {tr('How access works', 'Kuidas juht ligipääsu saab?')}
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            {[
              ['1', tr('HR selects the employee and team', 'Personalijuht valib töötaja ja tiimi')],
              [
                '2',
                tr(
                  'HR confirms access and email settings',
                  'Personalijuht kinnitab õigused ja e-posti seaded'
                ),
              ],
              [
                '3',
                tr(
                  'Employee claims the account if necessary and accepts a seven-day invitation',
                  'Töötaja võtab vajaduse korral konto kasutusele ja kinnitab kutse seitsme päeva jooksul'
                ),
              ],
              [
                '4',
                tr(
                  'Only that team becomes visible, subject to privacy and source coverage',
                  'Juht näeb oma tiimi koondandmeid, kui katvus on piisav'
                ),
              ],
            ].map(([n, txt]) => (
              <div key={n} className="rounded-lg bg-slate-50 p-3 text-sm">
                <span className="mr-2 font-bold">{n}.</span>
                {txt}
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-600">
            {directory?.minimum != null
              ? tr(
                  `At least ${directory.minimum} mapped contributors are required per reporting period.`,
                  `Igal aruandeperioodil peab olema vähemalt ${directory.minimum} andmetega seotud tiimiliiget.`
                )
              : tr(
                  'The reporting threshold is being checked.',
                  'Aruandluse alampiir on kontrollimisel.'
                )}{' '}
            {tr(
              'Manager email also requires an active delivery service.',
              'Nädalaaruande saatmiseks peab ka e-posti teenus olema sisse lülitatud.'
            )}
          </p>
        </section>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {et
              ? {
                  'Manager is not approved for this team in the HR roster':
                    'Kontrolli organisatsiooni struktuuris, kas see töötaja on kinnitatud just selle tiimi juhiks.',
                  'HR-approved manager identity changed. Reconcile the assignment first.':
                    'Tiimile kinnitatud juht on muutunud. Uuenda esmalt juhi määramist.',
                  'Please allow at least one minute between invitations':
                    'Oota enne uue kutse saatmist vähemalt minut.',
                  'Invitation could not be sent. Verify mail transport.':
                    'Kutset ei saanud saata. Kontrolli e-posti teenust.',
                  'Recipient is no longer employed or team is inactive':
                    'Töötaja või tiim ei ole enam aktiivne.',
                }[error] ||
                'Toiming ebaõnnestus. Kontrolli ligipääsu ja tiimi andmeid ning proovi uuesti.'
              : error}
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
        <section className="app-panel space-y-4">
          <h2 className="text-lg font-bold">
            {tr('1. Appoint a team manager', '1. Vali tiimijuht')}
          </h2>
          <p className="text-sm text-slate-600">
            {tr(
              'You can invite active employees and employees imported from Microsoft who have not created a SignalTrue account yet.',
              'Kutsuda saab nii aktiivse kontoga töötajat kui ka Microsoftist lisatud töötajat, kes pole veel SignalTrue kontot kasutusele võtnud.'
            )}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold">
              {tr('Employee', 'Töötaja')}
              <select
                className={field}
                value={person}
                onChange={(e) => {
                  setPerson(e.target.value);
                  setConfirm(false);
                }}
              >
                <option value="">{tr('Select an employee', 'Vali töötaja')}</option>
                {employees.map((u) => (
                  <option value={u.id} key={u.id}>
                    {u.name || u.email} · {u.email}{' '}
                    {u.accountStatus === 'pending'
                      ? tr('(account not claimed)', '(konto veel kasutusele võtmata)')
                      : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              {tr('Authorised team', 'Tiim')}
              <select
                className={field}
                value={team}
                onChange={(e) => {
                  setTeam(e.target.value);
                  setConfirm(false);
                }}
              >
                <option value="">{tr('Select a team', 'Vali tiim')}</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {employee && selectedTeam && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-semibold">
                {tr('2. Review the invitation scope', '2. Kontrolli ligipääsu ja õigusi')}
              </h3>
              <p className="mt-2 text-sm">
                <strong>{employee.name || employee.email}</strong>{' '}
                {tr('will have access only to', 'saab ligipääsu ainult järgmise tiimi andmetele:')}{' '}
                <strong>{selectedTeam.name}</strong>.{' '}
                {tr('Directory-mapped employees', 'Tiimiga seotud töötajaid')}:{' '}
                {teamDetails?.memberCount ?? tr('unverified', 'kinnitamata')}.
                {teamDetails?.reportingEligibleBySize === false
                  ? tr(
                      ' Team results remain withheld until minimum cohort and source conditions are satisfied.',
                      ' Tulemusi kuvatakse siis, kui nii osalejate arv kui ka allikate katvus on piisav.'
                    )
                  : tr(
                      ' Source coverage must also be sufficient before results can appear.',
                      ' Tulemuste kuvamiseks peab ka allikate katvus olema piisav.'
                    )}
              </p>
              {employee.accountStatus === 'pending' && (
                <p className="mt-2 text-sm font-semibold text-amber-800">
                  {tr(
                    'This employee must create a password using their invitation before signing in.',
                    'Töötaja peab enne esimest sisselogimist kutse kaudu parooli looma.'
                  )}
                </p>
              )}
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={weeklyEmail}
                    onChange={(e) => setWeeklyEmail(e.target.checked)}
                  />
                  {tr(
                    'Request weekly team email after acceptance',
                    'Saada tiimi nädalaaruanne pärast kutse vastuvõtmist'
                  )}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={allowPdf}
                    onChange={(e) => setAllowPdf(e.target.checked)}
                  />
                  {tr(
                    'Permit scoped PDF downloads',
                    'Luba selle tiimi PDF-aruannete allalaadimine'
                  )}
                </label>
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={confirm}
                  onChange={(e) => setConfirm(e.target.checked)}
                />
                {tr(
                  'I have checked the nominated employee, team and requested permissions.',
                  'Olen töötaja, tiimi ja ligipääsuõigused üle kontrollinud.'
                )}
              </label>
              {existing && (
                <p className="mt-2 text-sm text-amber-800">
                  {tr(
                    'This appointment already exists. Use the controls below.',
                    'See seos on juba olemas. Kutset ja õigusi saab muuta allpool.'
                  )}
                </p>
              )}
              <button
                type="button"
                className={'mt-3 ' + button}
                disabled={!confirm || busy || Boolean(existing)}
                onClick={appoint}
              >
                {tr('Approve manager appointment', 'Kinnita tiimijuhi määramine')}
              </button>
            </div>
          )}
        </section>
        <section className="app-panel space-y-3">
          <h2 className="text-lg font-bold">
            {tr('3. Invitations & current authorisations', '3. Kutsed ja kehtivad õigused')}
          </h2>
          {!assignments.length && (
            <p className="text-sm text-slate-600">
              {tr('No manager appointments yet.', 'Ühtki tiimijuhti pole veel määratud.')}
            </p>
          )}
          {assignments.map((a) => {
            const u = employees.find((x) => x.id === a.managerUserId);
            const assignedTeam = teams.find((x) => x.id === a.teamId);
            return (
              <div key={a.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      {u?.name ||
                        u?.email ||
                        tr('Previously assigned employee', 'Varem määratud töötaja')}{' '}
                      · {assignedTeam?.name || tr('Inactive team', 'Mitteaktiivne tiim')}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {a.status === 'active'
                        ? tr('Accepted and active', 'Kutse vastu võetud, ligipääs aktiivne')
                        : a.status === 'invited'
                          ? tr('Invitation pending acceptance', 'Kutse ootab vastuvõtmist')
                          : a.status === 'pending'
                            ? tr(
                                'Prepared, invitation not yet sent',
                                'Määramine ette valmistatud, kutse saatmata'
                              )
                            : a.status === 'revoked'
                              ? tr('Access revoked', 'Ligipääs tühistatud')
                              : a.status === 'declined'
                                ? tr('Invitation declined', 'Kutsest keeldutud')
                                : a.status === 'expired'
                                  ? tr('Invitation expired', 'Kutse aegunud')
                                  : tr('Status unavailable', 'Seisund teadmata')}
                      {a.invitedAt
                        ? tr(' · Sent ', ' · Saadetud ') +
                          new Date(a.invitedAt).toLocaleDateString(et ? 'et-EE' : 'en-GB')
                        : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['pending', 'invited'].includes(a.status) && (
                      <button
                        type="button"
                        disabled={busy}
                        className={secondary}
                        onClick={() => send(a.id)}
                      >
                        {a.status === 'invited'
                          ? tr('Resend invitation', 'Saada kutse uuesti')
                          : tr('Send invitation', 'Saada kutse')}
                      </button>
                    )}
                    {a.status !== 'revoked' && (
                      <button
                        type="button"
                        disabled={busy}
                        className={secondary + ' text-red-700'}
                        onClick={() => revoke(a.id)}
                      >
                        {tr('Revoke', 'Tühista ligipääs')}
                      </button>
                    )}
                  </div>
                </div>
                {a.status === 'active' && (
                  <div className="mt-3 flex flex-wrap gap-5 border-t pt-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(a.weeklyEmailEnabled)}
                        disabled={busy}
                        onChange={(e) => permission(a.id, 'weeklyEmailEnabled', e.target.checked)}
                      />
                      {tr('Weekly email subscription', 'Tiimi nädalaaruanne e-postiga')}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(a.exportEnabled)}
                        disabled={busy}
                        onChange={(e) => permission(a.id, 'exportEnabled', e.target.checked)}
                      />
                      {tr('Allow scoped PDF export', 'Luba tiimiaruande PDF-i allalaadimine')}
                    </label>
                  </div>
                )}
              </div>
            );
          })}
          <p className="text-xs text-slate-500">
            {tr(
              'HR approval, invitation delivery and access acceptance are separate events. Revocation is enforced on every API request. No individual messages or employee rankings are available.',
              'Personali kinnitus, kutse saatmine ja juhi nõusolek registreeritakse eraldi. Ligipääsu tühistamine jõustub järgmisest päringust. Juht näeb ainult tiimi koondandmeid.'
            )}
          </p>
        </section>
      </div>
    </AppShell>
  );
}
