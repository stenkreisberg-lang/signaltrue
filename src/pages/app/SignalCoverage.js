import React, { useEffect, useState } from 'react';
import { CheckCircle2, Database, Lock, ShieldCheck } from 'lucide-react';
import AppShell, { PageHeader } from '../../components/app/AppShell';
import api from '../../utils/api';
import { getAuthenticatedContext } from '../../utils/authContext';

export default function SignalCoverage() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState({ loading: true, sources: [], calibration: null });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const context = await getAuthenticatedContext();
        if (!active) return;
        setUser(context.user);
        const [integration, calibration] = await Promise.allSettled([
          api.get('/integration-dashboard/status'),
          context.orgId ? api.get(`/calibration/status/${context.orgId}`) : Promise.resolve(null),
        ]);

        if (!active) return;
        setStatus({
          loading: false,
          sources:
            integration.status === 'fulfilled' ? integration.value.data.integrations || [] : [],
          calibration:
            calibration.status === 'fulfilled' && calibration.value ? calibration.value.data : null,
        });
      } catch {
        if (active) setStatus({ loading: false, sources: [], calibration: null });
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const connected = status.sources.filter((source) => source.status === 'connected').length;
  const measuredSources = status.sources.filter(
    (source) => source.measurementStatus?.verified === true
  ).length;

  const getSourceStatus = (source) => {
    const measurement = source.measurementStatus;
    if (measurement?.verified) {
      return { label: measurement.label, className: 'status-ok' };
    }
    if (measurement?.state === 'disconnected') {
      return { label: 'Not connected', className: 'status-muted' };
    }
    return { label: measurement?.label || 'Not verified', className: 'status-warn' };
  };

  return (
    <AppShell user={user} section="Data Coverage">
      <PageHeader
        eyebrow="Governance"
        title="Data coverage and privacy"
        description="Understand which sources contribute to signals, how coverage matures, and the safeguards applied before any insight is shown."
      />
      <section className="app-metric-grid">
        <div className="app-metric">
          <Database size={20} />
          <div>
            <strong>{status.loading ? '...' : connected}</strong>
            <span>Sources connected</span>
          </div>
        </div>
        <div className="app-metric">
          <ShieldCheck size={20} />
          <div>
            <strong>{status.loading ? '...' : measuredSources}</strong>
            <span>Sources with verified events</span>
          </div>
        </div>
        <div className="app-metric">
          <Lock size={20} />
          <div>
            <strong>8 contributors</strong>
            <span>Sensitive metric threshold</span>
          </div>
        </div>
      </section>
      <section className="coverage-grid">
        <div className="app-panel">
          <h2>Source verification</h2>
          <p className="app-muted">
            Connection alone does not confirm usable activity. Missing, stale or unmapped data must
            never be treated as zero work.
          </p>
          {status.sources.length === 0 ? (
            <p className="coverage-empty">No connected sources are available yet.</p>
          ) : (
            <div className="coverage-list">
              {status.sources.map((source) => {
                const sourceStatus = getSourceStatus(source);
                const mapped = source.coverage?.mapped || 0;
                const total = source.coverage?.total || 0;
                return (
                  <div key={source.type} className="coverage-source">
                    <div className="coverage-source-main">
                      <span>{source.name || source.type}</span>
                      <small>
                        {mapped}/{total} mapped people
                        {source.lastSync
                          ? ` · last sync ${new Date(source.lastSync).toLocaleDateString()}`
                          : ''}
                      </small>
                      {source.statusMessage && <small>{source.statusMessage}</small>}
                      {source.sourceEvidence && !source.sourceEvidence.evidenceQueryFailed && (
                        <small>
                          Last seven days:{' '}
                          {Number(source.sourceEvidence.storedEvents7d || 0).toLocaleString()}{' '}
                          stored events,{' '}
                          {Number(source.sourceEvidence.attributedEvents7d || 0).toLocaleString()}{' '}
                          assigned to employees
                          {source.sourceEvidence.lastEventReceived
                            ? ` · latest ${new Date(source.sourceEvidence.lastEventReceived).toLocaleDateString()}`
                            : ''}
                        </small>
                      )}
                      {source.measurementStatus?.reason && (
                        <small>{source.measurementStatus.reason}</small>
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
          <h2>Privacy controls</h2>
          {[
            'No message, email or document content is stored or analyzed.',
            'No individual employee scores are exposed.',
            'Minimum group thresholds suppress sensitive results.',
            'Role-based access protects organization data.',
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
