import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import api from '../../utils/api';
import AppShell from '../../components/app/AppShell';

const panel = 'rounded-xl border bg-white p-5';
const control = 'rounded-lg border border-slate-300 bg-white px-3 py-2';
const cta = 'rounded-lg bg-slate-900 px-4 py-2 font-bold text-white disabled:opacity-50';
const statusEt = {
  improved: 'Muutus oodatud suunas',
  worsened: 'Muutus vastassuunas',
  unchanged: 'Olulise muutuseta',
  insufficient_evidence: 'Võrreldavaid andmeid napib',
  claimed: 'Saatmisel',
  sent: 'E-posti teenus võttis kirja vastu',
  delivered: 'Kohaletoimetamine kinnitatud',
  bounced: 'Kiri tagastati',
  failed: 'Saatmine ebaõnnestus',
  cancelled: 'Saatmine tühistati',
  unknown: 'Saatus kinnitamata',
};
const statusEn = {
  improved: 'Moved in the expected direction',
  worsened: 'Moved away from the expected direction',
  unchanged: 'Little change',
  insufficient_evidence: 'Insufficient comparable evidence',
  sent: 'Accepted by the email provider',
  delivered: 'Delivery confirmed',
};
const actionKey = (key) => (key === 'meetings' ? 'meetingsPerRepresentedPerson' : key);

function TeamReport({ team, locale, teamChanged, onPreference }) {
  const et = locale === 'et',
    t = (en, etText) => (et ? etText : en);
  const fmt = (v) =>
    Number.isFinite(v)
      ? new Intl.NumberFormat(et ? 'et-EE' : 'en-GB', { maximumFractionDigits: 2 }).format(v)
      : t('Unavailable', 'Andmed puuduvad');
  const date = (v) =>
    v
      ? new Date(v).toLocaleDateString(et ? 'et-EE' : 'en-GB', {
          day: 'numeric',
          month: 'short',
          timeZone: 'UTC',
        })
      : '';
  const status = (v) => (et ? statusEt : statusEn)[v] || v;
  const [report, setReport] = useState(null),
    [failed, setFailed] = useState(false),
    [update, setUpdate] = useState(0);
  const [selected, setSelected] = useState('meetings'),
    [weeks, setWeeks] = useState(4);
  const [title, setTitle] = useState(''),
    [hypothesis, setHypothesis] = useState(''),
    [direction, setDirection] = useState('decrease');
  const [metric, setMetric] = useState(''),
    [note, setNote] = useState(''),
    [tag, setTag] = useState('planning');
  const [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const mounted = useRef(false);
  const actionInput = useRef(null);
  const path = '/manager-intelligence/teams/' + team.teamId;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setFailed(false);
    api
      .get(path + '/trends')
      .then((r) => {
        if (active) setReport(r.data);
      })
      .catch(() => {
        if (active) {
          setFailed(true);
          setReport(null);
        }
      });
    return () => {
      active = false;
    };
  }, [path, update]);
  async function perform(operation, success) {
    if (busy) return;
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const result = await operation();
      if (mounted.current) {
        success(result);
        setUpdate((i) => i + 1);
      }
    } catch {
      if (mounted.current)
        setError(
          t(
            'Could not complete the request. Check access and current evidence, then retry.',
            'Toiming ebaõnnestus. Kontrolli ligipääsu ja andmete olemasolu ning proovi uuesti.'
          )
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  const series = report?.trendSeries || [];
  const current = series.find((s) => s.key === selected) || series[0];
  const options = series.filter((s) => s.baselineAvailable);
  const chosen = options.find((s) => actionKey(s.key) === metric) || options[0];
  const saveAction = (e) => {
    e.preventDefault();
    if (!chosen || !title.trim()) return;
    perform(
      () =>
        api.post(path + '/actions', {
          title,
          hypothesis,
          direction,
          metric: actionKey(chosen.key),
        }),
      () => {
        setTitle('');
        setHypothesis('');
        setMessage(
          t(
            'Decision saved. Reviews are scheduled for days 14 and 28.',
            'Otsus on salvestatud. Järelkontrollid toimuvad 14 ja 28 päeva pärast.'
          )
        );
      }
    );
  };
  const saveContext = (e) => {
    e.preventDefault();
    const monday = new Date();
    monday.setUTCHours(0, 0, 0, 0);
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7) - 7);
    perform(
      () => api.post(path + '/context', { weekStart: monday.toISOString(), tag, note }),
      () => {
        setNote('');
        setMessage(t('Week context saved.', 'Nädala selgitus on salvestatud.'));
      }
    );
  };
  const download = () =>
    perform(
      () => api.get(path + '/report.pdf', { responseType: 'blob' }),
      (r) => {
        const url = URL.createObjectURL(r.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'signaltrue-team.pdf';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    );
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {teamChanged}
        <label>
          <input
            type="checkbox"
            disabled={busy}
            checked={team.weeklyEmailEnabled !== false}
            onChange={(e) => {
              const checked = e.target.checked;
              perform(
                () =>
                  api.patch('/manager-intelligence/me/preferences', {
                    teamId: team.teamId,
                    weeklyEmailEnabled: checked,
                  }),
                () => onPreference(team.teamId, checked)
              );
            }}
          />{' '}
          {t('Weekly email', 'Iganädalane e-kiri')}
        </label>
      </div>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {failed ? (
        <div role="alert">
          {t('Team report could not be loaded.', 'Tiimi aruannet ei õnnestunud laadida.')}{' '}
          <button className={control} onClick={() => setUpdate((n) => n + 1)}>
            {t('Retry', 'Proovi uuesti')}
          </button>
        </div>
      ) : !report ? (
        <p role="status">{t('Loading team measurements…', 'Laadin tiimi mõõtmisi…')}</p>
      ) : !report.eligible ? (
        <p className={panel}>
          {t(
            'This team has insufficient source coverage or too few represented contributors for a report.',
            'Tiimi aruande jaoks on allikate katvus või esindatud inimeste arv liiga väike.'
          )}
        </p>
      ) : (
        <>
          <section className={panel}>
            <h2 className="text-xl font-bold">
              {t('What changed this week?', 'Mis sel nädalal muutus?')}
            </h2>
            {report.findings?.length ? (
              report.findings.map((f, i) => (
                <div key={f.key} className="mt-4 border-t pt-3">
                  <h3 className="font-semibold">{f.label}</h3>
                  <p>
                    {fmt(f.baseline)} →{' '}
                    <strong>
                      {fmt(f.current)} {f.unit}
                    </strong>{' '}
                    · {date(f.sampledOn)}
                  </p>
                  <p>
                    {t('Change from the median', 'Muutus võrreldes mediaaniga')} ({f.periods}{' '}
                    {t('earlier weeks', 'varasemat nädalat')}): {f.delta > 0 ? '+' : ''}
                    {fmt(f.delta)}{' '}
                    {f.unit === '%' ? t('percentage points', 'protsendipunkti') : f.unit}
                    {f.changePct != null ? ' (' + fmt(f.changePct) + '%)' : ''}
                  </p>
                  <p className="my-1">{f.question}</p>
                  {i === 0 && (
                    <button
                      className={control}
                      onClick={() => {
                        setMetric(actionKey(f.key));
                        actionInput.current?.focus();
                      }}
                    >
                      {t(
                        'Record a decision about this change',
                        'Salvesta selle muutusega seotud otsus'
                      )}
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p>
                {t(
                  'No change can be ranked from comparable weekly observations. The chart shows which measurements are available.',
                  'Võrreldavate nädalate põhjal ei eristu muutust. Graafikult näed, millised mõõtmised on olemas.'
                )}
              </p>
            )}
          </section>
          <section className={panel}>
            <h2 className="text-xl font-bold">
              {t('Work patterns across weeks', 'Töömustrite muutus ajas')}
            </h2>
            <div className="my-3 flex flex-wrap items-center gap-3">
              <label>
                {t('Measurement', 'Näitaja')}{' '}
                <select
                  className={control}
                  value={current?.key || ''}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {series.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              {[1, 4, 13, 26].map((n, i) => (
                <button
                  key={n}
                  aria-pressed={weeks === n}
                  className={weeks === n ? cta : control}
                  onClick={() => setWeeks(n)}
                >
                  {
                    (et
                      ? ['1 nädal', '1 kuu', '3 kuud', '6 kuud']
                      : ['1 week', '1 month', '3 months', '6 months'])[i]
                  }
                </button>
              ))}
            </div>
            <p>
              {current?.label} · {current?.unit} · {t('Latest', 'Viimane mõõtmine')}{' '}
              {fmt(current?.points.at(-1)?.value)}
            </p>
            <div className="h-64" role="img" aria-label={current?.label}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={current?.points.slice(-weeks) || []}>
                  <CartesianGrid strokeDasharray="3 4" />
                  <XAxis dataKey="sampledOn" tickFormatter={date} minTickGap={18} />
                  <YAxis width={40} />
                  <Tooltip labelFormatter={date} formatter={(v) => [fmt(v), current?.unit]} />
                  {current?.summary && (
                    <ReferenceLine y={current.summary.baseline} strokeDasharray="5 4" />
                  )}
                  <Line
                    dataKey="value"
                    stroke="#0f766e"
                    strokeWidth={3}
                    connectNulls={false}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm">
              {t(
                'Each point covers seven days. Gaps indicate unavailable measurements.',
                'Iga punkt hõlmab seitset päeva. Lünk tähistab puuduvat mõõtmist.'
              )}
            </p>
            {team.exportEnabled && (
              <button className={control} onClick={download}>
                {t('Download PDF', 'Laadi PDF alla')}
              </button>
            )}
          </section>
          <section id="actions" className={panel}>
            <h2 className="text-xl font-bold">
              {t('Record a management decision', 'Salvesta juhtimisotsus')}
            </h2>
            {options.length ? (
              <form className="mt-3 grid gap-3" onSubmit={saveAction}>
                <label>
                  {t('What will you change?', 'Mida muudad?')}{' '}
                  <input
                    ref={actionInput}
                    className={control + ' w-full'}
                    required
                    maxLength={180}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                <div className="flex flex-wrap gap-3">
                  <label>
                    {t('Measure', 'Mõõdik')}{' '}
                    <select
                      className={control}
                      value={actionKey(chosen.key)}
                      onChange={(e) => setMetric(e.target.value)}
                    >
                      {options.map((s) => (
                        <option key={s.key} value={actionKey(s.key)}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t('Expected change', 'Oodatav muutus')}{' '}
                    <select
                      className={control}
                      value={direction}
                      onChange={(e) => setDirection(e.target.value)}
                    >
                      {['decrease', 'increase', 'stabilize'].map((k, i) => (
                        <option key={k} value={k}>
                          {
                            (et
                              ? ['Väheneb', 'Suureneb', 'Püsib samal tasemel']
                              : ['Decrease', 'Increase', 'Remain stable'])[i]
                          }
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p>
                  {t('Starting point', 'Lähtetase')}: {fmt(chosen.points.at(-1).value)}{' '}
                  {chosen.unit} · {date(chosen.points.at(-1).sampledOn)}
                </p>
                <label>
                  {t('Expected outcome (optional detail)', 'Oodatav tulemus (täpsustus)')}{' '}
                  <input
                    className={control + ' w-full'}
                    maxLength={1000}
                    value={hypothesis}
                    onChange={(e) => setHypothesis(e.target.value)}
                  />
                </label>
                <button className={cta} disabled={busy || !title.trim()}>
                  {t('Save decision and schedule reviews', 'Salvesta otsus ja järelkontrollid')}
                </button>
              </form>
            ) : (
              <p>
                {t(
                  'A recent verified baseline is required to measure a decision.',
                  'Otsuse mõju jälgimiseks on vaja värsket kontrollitud lähtetaset.'
                )}
              </p>
            )}
            {report.actions?.map((a) => (
              <article className="mt-4 border-t pt-3" key={a.id}>
                <h3 className="font-bold">{a.title}</h3>
                <p>
                  {series.find((s) => actionKey(s.key) === a.metric)?.label} · {fmt(a.baseline)}
                </p>
                {[14, 28].map((day) => {
                  const o = a['outcome' + day];
                  return (
                    <p key={day}>
                      {t('Day', 'Päev')} {day} · {date(a['due' + day])} ·{' '}
                      {o?.status ? status(o.status) : t('Pending', 'Ootel')}
                      {Number.isFinite(o?.value) ? ' · ' + fmt(o.value) : ''}
                    </p>
                  );
                })}
                <button
                  className={control}
                  disabled={busy || new Date(a.due14) > new Date()}
                  onClick={() =>
                    perform(
                      () => api.post(path + '/actions/' + a.id + '/review'),
                      (r) => setMessage(status(r.data.status))
                    )
                  }
                >
                  {t('Check follow-up', 'Vaata järelkontrolli')}
                </button>
              </article>
            ))}
            <p className="mt-3 text-sm">
              {t(
                'The comparison shows what changed after the decision. Other changes may also explain it.',
                'Võrdlus näitab, mis pärast otsust muutus. Muutusel võib olla ka teisi põhjuseid.'
              )}
            </p>
          </section>
          <details className={panel}>
            <summary>
              {t('Add context to the previous week', 'Lisa eelmise nädala selgitus')}
            </summary>
            <form className="mt-2 flex flex-wrap gap-2" onSubmit={saveContext}>
              <select
                aria-label={t('Context', 'Selgituse liik')}
                className={control}
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              >
                {[
                  'planning',
                  'launch',
                  'deadline',
                  'offsite',
                  'holiday',
                  'reorganization',
                  'other',
                ].map((k, i) => (
                  <option key={k} value={k}>
                    {et
                      ? [
                          'Planeerimine',
                          'Käivitus',
                          'Tähtaeg',
                          'Meeskonnapäev',
                          'Pühad',
                          'Ümberkorraldus',
                          'Muu',
                        ][i]
                      : k}
                  </option>
                ))}
              </select>
              <input
                aria-label={t('Optional note', 'Lisamärkus')}
                className={control}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button disabled={busy} className={control}>
                {t('Save', 'Salvesta')}
              </button>
            </form>
            {report.contexts?.map((c, i) => (
              <p key={i}>
                {date(c.weekStart)} ·{' '}
                {et
                  ? {
                      planning: 'Planeerimine',
                      launch: 'Käivitus',
                      deadline: 'Tähtaeg',
                      offsite: 'Meeskonnapäev',
                      holiday: 'Pühad',
                      reorganization: 'Ümberkorraldus',
                      other: 'Muu',
                    }[c.tag] || c.tag
                  : c.tag}{' '}
                {c.note}
              </p>
            ))}
          </details>
        </>
      )}
    </>
  );
}

export default function ManagerTeamDashboard() {
  const [teams, setTeams] = useState(null),
    [selected, setSelected] = useState(''),
    [locale, setLocale] = useState('en'),
    [failed, setFailed] = useState(false),
    [deliveries, setDeliveries] = useState(null),
    [deliveryFailed, setDeliveryFailed] = useState(false);
  const load = useCallback(() => {
    let active = true;
    setFailed(false);
    setTeams(null);
    api
      .get('/manager-intelligence/me/teams')
      .then(({ data }) => {
        if (active) {
          setLocale(data.locale || 'en');
          setTeams(data.teams);
          setSelected(data.teams[0]?.teamId || '');
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const [attempt, setAttempt] = useState(0);
  useEffect(load, [load, attempt]);
  useEffect(() => {
    let active = true;
    api
      .get('/manager-intelligence/me/deliveries')
      .then(({ data }) => {
        if (active) setDeliveries(data.deliveries);
      })
      .catch(() => {
        if (active) setDeliveryFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const et = locale === 'et',
    team = teams?.find((t) => t.teamId === selected);
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch {
    /* Invalid cached display profile. */
  }
  return (
    <AppShell user={user} mode="manager" locale={locale} section={et ? 'Minu tiim' : 'My team'}>
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap justify-between gap-3">
          <h1 className="text-3xl font-bold">{team?.name || (et ? 'Minu tiim' : 'My team')}</h1>
          <Link className={control} to="/dashboard">
            {et ? 'Tagasi konto juurde' : 'Back to account'}
          </Link>
        </header>
        {failed ? (
          <p role="alert">
            {et ? 'Ligipääsu kontroll ebaõnnestus.' : 'Could not verify team access.'}{' '}
            <button onClick={() => setAttempt((v) => v + 1)}>
              {et ? 'Proovi uuesti' : 'Retry'}
            </button>
          </p>
        ) : !teams ? (
          <p role="status">{et ? 'Kontrollin ligipääsu…' : 'Verifying team access…'}</p>
        ) : !team ? (
          <p className={panel}>
            {et
              ? 'Sul puudub aktiivne tiimijuhi ligipääs. Ligipääsu saamiseks pöördu personalijuhi poole.'
              : 'No active manager appointment. Contact HR to request access.'}
          </p>
        ) : (
          <TeamReport
            key={selected}
            team={team}
            locale={locale}
            onPreference={(id, checked) =>
              setTeams((list) =>
                list.map((v) => (v.teamId === id ? { ...v, weeklyEmailEnabled: checked } : v))
              )
            }
            teamChanged={
              <label>
                {et ? 'Tiim' : 'Team'}{' '}
                <select
                  aria-label={et ? 'Tiim' : 'Team'}
                  className={control}
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {teams.map((v) => (
                    <option key={v.teamId} value={v.teamId}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>
            }
          />
        )}
        <section id="reports" className={panel}>
          <h2 className="text-lg font-bold">
            {et ? 'Minu aruannete saatmisajalugu' : 'My report delivery history'}
          </h2>
          {deliveryFailed ? (
            <p>
              {et ? 'Saatmisajalugu ei saanud laadida.' : 'Delivery history could not be loaded.'}
            </p>
          ) : !deliveries ? (
            <p>{et ? 'Laadin…' : 'Loading…'}</p>
          ) : deliveries.length ? (
            deliveries.slice(0, 8).map((d, i) => (
              <p key={i}>
                {d.weekKey} · {(et ? statusEt : statusEn)[d.status] || d.status}
              </p>
            ))
          ) : (
            <p>{et ? 'Saatmiskirjeid veel pole.' : 'No report deliveries recorded.'}</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
