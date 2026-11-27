import { adminTranslator } from '../../utils/adminLanguage';
import React, { useEffect, useState } from 'react';
import { CheckCircle2, Database, Lock, ShieldCheck } from 'lucide-react';
import AppShell, { PageHeader } from '../../components/app/AppShell';
import api from '../../utils/api';
import { getAuthenticatedContext } from '../../utils/authContext';

export default function SignalCoverage() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState({
    loading: true,
    sources: [],
    minimumSize: null,
    error: false,
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const context = await getAuthenticatedContext();
        if (!active) return;
        setUser(context.user);
        const integration = await api.get('/integration-dashboard/status');
        const data = integration.data;
        if (!Array.isArray(data?.integrations)) throw new Error('Invalid integration response');
        if (!active) return;
        setStatus({
          loading: false,
          sources: data.integrations,
          minimumSize: data.setup?.teams?.minimumSize ?? null,
          error: false,
        });
      } catch {
        if (active) setStatus({ loading: false, sources: [], minimumSize: null, error: true });
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const locale = user?.reportLanguage || 'en';
  const t = adminTranslator(locale);
  const format = locale === 'et' ? 'et-EE' : 'en-GB';
  const count = (value) =>
    Number.isFinite(value) ? value.toLocaleString(format) : t('Unavailable');
  const connected = status.sources.filter((source) => {
    return ['connected', 'measuring'].includes(source.status);
  }).length;
  const measuredSources = status.sources.filter(
    (source) => source.measurementStatus?.verified === true
  ).length;

  const getSourceStatus = (source) => {
    const measurement = source.measurementStatus;
    if (measurement?.verified) {
      return { label: t(measurement.label), className: 'status-ok' };
    }
    if (measurement?.state === 'disconnected') {
      return { label: t('Not connected'), className: 'status-muted' };
    }
    return { label: t(measurement?.label || t('Not verified')), className: 'status-warn' };
  };

  return (
    <AppShell locale={locale} user={user} section={t('Data Coverage')}>
      <PageHeader
        eyebrow={t('Governance')}
        title={t('Data coverage and privacy')}
        description={t(
          'Understand which sources contribute to signals, how coverage matures, and the safeguards applied before any insight is shown.'
        )}
      />
      <section className="app-metric-grid">
        <div className="app-metric">
          <Database size={20} />
          <div>
            <strong>{status.loading ? '...' : status.error ? t('Unavailable') : connected}</strong>
            <span>{t('Sources connected')}</span>
          </div>
        </div>
        <div className="app-metric">
          <ShieldCheck size={20} />
          <div>
            <strong>
              {status.loading ? '...' : status.error ? t('Unavailable') : measuredSources}
            </strong>
            <span>{t('Sources with verified events')}</span>
          </div>
        </div>
        <div className="app-metric">
          <Lock size={20} />
          <div>
            <strong>{status.loading ? '...' : (status.minimumSize ?? t('Unavailable'))}</strong>
            <span>{t('Minimum team size for reporting')}</span>
          </div>
        </div>
      </section>
      <section className="coverage-grid">
        <div className="app-panel">
          <h2>{t('Source verification')}</h2>
          <p className="app-muted">
            {t(
              'Connection alone does not confirm usable activity. Missing, stale or unmapped data must never be treated as zero work.'
            )}
          </p>
          {status.loading ? (
            <p className="coverage-empty">{t('Checking source status…')}</p>
          ) : status.error ? (
            <p className="coverage-empty" role="alert">
              {t(
                'Source status could not be loaded. Refresh to retry. This does not mean sources are disconnected.'
              )}
            </p>
          ) : status.sources.length === 0 ? (
            <p className="coverage-empty">{t('No connected sources are available yet.')}</p>
          ) : (
            <div className="coverage-list">
              {status.sources.map((source) => {
                const sourceStatus = getSourceStatus(source);
                const mapped = source.coverage?.mapped;
                const total = source.coverage?.total;
                return (
                  <div key={source.type} className="coverage-source">
                    <div className="coverage-source-main">
                      <span>{source.name || source.type}</span>
                      <small>
                        {Number.isFinite(mapped) && Number.isFinite(total) && total > 0
                          ? mapped + '/' + total + ' ' + t('mapped people')
                          : t('Employee coverage unavailable')}
                        {source.lastSync
                          ? ` · ${t('last sync')} ${new Date(source.lastSync).toLocaleDateString(format)}`
                          : ''}
                      </small>
                      {source.statusMessage && <small>{t(source.statusMessage)}</small>}
                      {source.sourceEvidence && !source.sourceEvidence.evidenceQueryFailed && (
                        <small>
                          {t('Last seven days:')} {count(source.sourceEvidence.storedEvents7d)}{' '}
                          {t('stored events,')} {count(source.sourceEvidence.attributedEvents7d)}{' '}
                          {t('assigned to employees')}
                          {source.sourceEvidence.lastEventReceived
                            ? ` · ${t('latest event')} ${new Date(source.sourceEvidence.lastEventReceived).toLocaleDateString(format)}`
                            : ''}
                        </small>
                      )}
                      {source.measurementStatus?.reason && (
                        <small>{t(source.measurementStatus.reason)}</small>
                      )}
                    </div>
                    <span className={sourceStatus.className}>{sourceStatus.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="app-panel">
          <h2>{t('Privacy controls')}</h2>
          {[
            t('No message, email or document content is stored or analyzed.'),
            t('No individual employee scores are exposed.'),
            t(
              'Reporting uses the configured minimum team size and requires adequate mapped activity. Small-team aggregates may permit individual inference.'
            ),
            t('Role-based access protects organization data.'),
          ].map((line) => (
            <div className="coverage-rule" key={line}>
              <CheckCircle2 size={18} />
              <span>{line}</span>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
