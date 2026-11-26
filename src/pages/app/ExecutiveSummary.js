import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell, { PageHeader } from '../../components/app/AppShell';
import api from '../../utils/api';
import { getAuthenticatedContext } from '../../utils/authContext';

const labels = {
  meeting_hours: [
    'Meeting hours per calendar participant',
    'Koosolekutunde kalendrikasutaja kohta',
  ],
  focus_time: [
    'Available calendar hours per calendar participant',
    'Vaba kalendriaega kalendrikasutaja kohta',
  ],
  after_hours: ['After-hours message share', 'Tööväliste sõnumite osakaal'],
  messages: ['Observed messages', 'Mõõdetud sõnumeid'],
};
const riskLabels = {
  Critical: 'Kriitiline',
  Risk: 'Vajab kontrolli',
  Informational: 'Teadmiseks',
  High: 'kõrge',
  Medium: 'keskmine',
};

export default function ExecutiveSummary() {
  const [user, setUser] = useState(null),
    [summary, setSummary] = useState(null),
    [loading, setLoading] = useState(true);
  const [error, setError] = useState(false),
    [shareStatus, setShareStatus] = useState(''),
    [sharing, setSharing] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    setSummary(null);
    setShareStatus('');
    try {
      const context = await getAuthenticatedContext();
      setUser(context.user);
      if (!context.orgId) throw new Error('Missing tenant');
      const r = await api.get('/trial/executive-summary/' + context.orgId);
      setSummary(r.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const et = summary?.locale === 'et',
    t = (en, estonian) => (et ? estonian : en);
  const fmt = (n) =>
    Number.isFinite(n)
      ? new Intl.NumberFormat(et ? 'et-EE' : 'en-GB', { maximumFractionDigits: 2 }).format(n)
      : t('Unavailable', 'Andmed puuduvad');
  const share = async () => {
    setSharing(true);
    try {
      const r = await api.post('/trial/generate-ceo-summary');
      await navigator.clipboard.writeText(
        window.location.origin + '/ceo-summary/' + r.data.shareToken
      );
      setShareStatus(t('Executive link copied.', 'Juhtkonna kokkuvõtte link on kopeeritud.'));
    } catch {
      setShareStatus(t('Could not copy a share link.', 'Lingi kopeerimine ebaõnnestus.'));
    } finally {
      setSharing(false);
    }
  };
  const work = summary?.workPatterns,
    controls = summary?.controlSummary;
  const title = t('Executive decision brief', 'Juhtkonna kokkuvõte');
  const decision =
    controls?.due > 0
      ? t(
          'Assign an owner to the overdue reviews and agree a decision date.',
          'Määrake tähtaja ületanud järelkontrollidele vastutaja ja leppige kokku otsustamise aeg.'
        )
      : summary?.evidenceSummary?.criticalSignals > 0
        ? t(
            'Ask the responsible teams to check the highest-priority observations.',
            'Paluge vastutavatel tiimidel kõige olulisemad tähelepanekud üle kontrollida.'
          )
        : work?.metrics?.find((m) => m.key === 'focus_time')?.delta < 0
          ? t(
              'Calendar availability fell. Ask teams whether meeting placement explains the reduction.',
              'Vaba kalendriaega jäi vähem. Uurige tiimidelt, kas muutust selgitab koosolekute paigutus.'
            )
          : t(
              'Check the measured changes with the teams before choosing a new action.',
              'Enne uue tegevuse valimist arutage mõõdetud muutusi tiimidega.'
            );
  return (
    <AppShell user={user} locale={summary?.locale} section={title}>
      <PageHeader
        title={title}
        description={summary?.orgName}
        action={
          <button className="app-secondary-button" onClick={load} disabled={loading}>
            {t('Refresh', 'Värskenda')}
          </button>
        }
      />
      {loading ? (
        <p role="status">{t('Loading…', 'Laadin…')}</p>
      ) : error ? (
        <p role="alert">
          {t(
            'Could not load the executive brief. Check access and try again.',
            'Kokkuvõtet ei saanud laadida. Kontrolli ligipääsu ja proovi uuesti.'
          )}
        </p>
      ) : (
        summary && (
          <>
            <section className="app-panel mb-5">
              <h2>{t('What needs a leadership decision?', 'Mis vajab juhtkonna otsust?')}</h2>
              <p className="mt-2 text-lg">{decision}</p>
              <p className="app-muted">
                {t('Newly recorded signals this week', 'Sel nädalal lisandunud signaale')}:{' '}
                {fmt(summary.recentSignalCount)} · {t('previous week', 'eelmisel nädalal')}:{' '}
                {fmt(summary.olderSignalCount)}.
              </p>
            </section>
            <section className="app-panel mb-5">
              <h2>{t('Organisational work patterns', 'Organisatsiooni töömustrid')}</h2>
              {work?.state === 'observed' ? (
                <>
                  <p className="app-muted">
                    {t('Latest completed reporting week', 'Viimane lõppenud aruandenädal')} ·{' '}
                    {new Date(work.periodStart).toLocaleDateString(et ? 'et-EE' : 'en-GB', {
                      timeZone: summary.timezone || 'UTC',
                    })}{' '}
                    –{' '}
                    {new Date(new Date(work.periodEnd) - 1).toLocaleDateString(
                      et ? 'et-EE' : 'en-GB',
                      { timeZone: summary.timezone || 'UTC' }
                    )}
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {work.metrics.map((m) => (
                      <div className="rounded-lg border p-3" key={m.key}>
                        <h3 className="font-semibold">{labels[m.key]?.[et ? 1 : 0]}</h3>
                        <p className="text-2xl font-bold">
                          {fmt(m.current)}
                          {m.current !== null &&
                            (m.unit === 'hours' ? ' h' : m.unit === '%' ? '%' : '')}
                        </p>
                        <p className="app-muted">
                          {m.delta == null
                            ? t('No comparable previous value', 'Võrreldav eelmine mõõtmine puudub')
                            : t('Change from previous week', 'Muutus võrreldes eelmise nädalaga') +
                              ': ' +
                              (m.delta > 0 ? '+' : '') +
                              fmt(m.delta) +
                              (m.unit === '%'
                                ? t(' percentage points', ' protsendipunkti')
                                : m.unit === 'hours'
                                  ? ' h'
                                  : '')}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3">
                    {work.reconciled
                      ? t(
                          'Source checks passed for this reporting period.',
                          'Perioodi algandmete kontroll on läbitud.'
                        )
                      : t(
                          'Source-to-report reconciliation is unconfirmed for this period.',
                          'Selle perioodi algandmete ja aruande vastavus on kinnitamata.'
                        )}
                  </p>
                </>
              ) : (
                <p>
                  {t(
                    'A current organisational report with sufficient measurements is unavailable.',
                    'Selle nädala kohta puudub piisavate mõõtmistega organisatsiooni aruanne.'
                  )}
                </p>
              )}
            </section>
            <section className="app-panel mb-5">
              <h2>{t('Management actions and reviews', 'Juhtimistegevused ja järelkontrollid')}</h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Active', 'Pooleli', controls?.active],
                  ['Overdue', 'Üle tähtaja', controls?.due],
                  ['Completed', 'Lõpetatud', controls?.completed],
                  ['Measured improvement', 'Mõõdetud paranemine', controls?.improved],
                ].map(([en, ee, value]) => (
                  <div key={en}>
                    <dt>{t(en, ee)}</dt>
                    <dd className="text-2xl font-bold">{fmt(value)}</dd>
                  </div>
                ))}
              </dl>
              <p className="app-muted">
                {t(
                  'A before-and-after comparison can show a change. Other factors may explain it.',
                  'Võrdlus näitab, mis pärast otsust muutus. Muutusel võib olla ka teisi põhjuseid.'
                )}
              </p>
              {user?.role !== 'executive' && (
                <Link to="/app/actions">
                  {t('Review action records', 'Vaata tegevuste ülevaadet')}
                </Link>
              )}
            </section>
            {!!summary.topRisks?.length && (
              <section className="app-panel mb-5">
                <h2>
                  {t('Team observations for review', 'Kontrollimist vajavad tiimide tähelepanekud')}
                </h2>
                {summary.topRisks.map((r) => (
                  <article className="mt-3 border-t pt-3" key={r.id}>
                    <h3 className="font-semibold">{r.title}</h3>
                    <p>
                      {r.teamName} · {et ? riskLabels[r.severity] || r.severity : r.severity}
                    </p>
                    <p>
                      {t('Current', 'Praegu')}: {fmt(r.currentValue)} · {t('Baseline', 'Lähtetase')}
                      : {fmt(r.baselineValue)}
                    </p>
                  </article>
                ))}
              </section>
            )}
            {summary.evidenceSummary?.unqualifiedObservations > 0 && (
              <p>
                {t(
                  'Observations awaiting stronger evidence',
                  'Lisatõendeid vajavaid tähelepanekuid'
                )}
                : {fmt(summary.evidenceSummary.unqualifiedObservations)}
              </p>
            )}
            {user?.role !== 'executive' && (
              <button onClick={share} disabled={sharing} className="app-secondary-button">
                {t('Copy executive share link', 'Kopeeri juhtkonna kokkuvõtte link')}
              </button>
            )}
            {shareStatus && <p role="status">{shareStatus}</p>}
          </>
        )
      )}
    </AppShell>
  );
}
