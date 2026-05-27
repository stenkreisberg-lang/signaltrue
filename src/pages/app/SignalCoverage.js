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
      } catch (error) {
        if (active) setStatus({ loading: false, sources: [], calibration: null });
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const connected = status.sources.filter((source) => source.status === 'connected').length;

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
            <strong>{status.calibration?.isInCalibration ? 'Calibrating' : 'Active'}</strong>
            <span>Signal readiness</span>
          </div>
        </div>
        <div className="app-metric">
          <Lock size={20} />
          <div>
            <strong>Team level</strong>
            <span>Visibility threshold</span>
          </div>
        </div>
      </section>
      <section className="coverage-grid">
        <div className="app-panel">
          <h2>Connected sources</h2>
          <p className="app-muted">
            Only timing, counts and collaboration metadata contribute to analysis.
          </p>
          {status.sources.length === 0 ? (
            <p className="coverage-empty">No connected sources are available yet.</p>
          ) : (
            <div className="coverage-list">
              {status.sources.map((source) => (
                <div key={source.type} className="coverage-source">
                  <span>{source.name || source.type}</span>
                  <span className={source.status === 'connected' ? 'status-ok' : 'status-muted'}>
                    {source.status === 'connected' ? 'Connected' : 'Not connected'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="app-panel">
          <h2>Privacy controls</h2>
          {[
            'No message, email or document content is collected.',
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
