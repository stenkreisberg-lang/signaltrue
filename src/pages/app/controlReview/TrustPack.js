import React, { useCallback, useEffect, useState } from 'react';
import AppShell, { PageHeader } from '../../../components/app/AppShell';
import controlReviewApi, { formatDate } from '../../../utils/controlReviewApi';
import { getAuthenticatedContext } from '../../../utils/authContext';

/**
 * Trust Deployment Pack (spec §21, §22).
 *
 * Deployment trust is a product requirement, not a document folder. A customer
 * should be able to explain SignalTrue to workers before anything is connected,
 * which is why activation is gated on this page rather than merely informed by it.
 */

/** Group the jurisdiction list into <optgroup>s by region. */
function groupByRegion(items) {
  const byRegion = new Map();
  for (const item of items) {
    if (!byRegion.has(item.region)) byRegion.set(item.region, []);
    byRegion.get(item.region).push(item);
  }
  return [...byRegion.entries()];
}

export default function TrustPack() {
  const [user, setUser] = useState(null);
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const context = await getAuthenticatedContext();
      setUser(context.user);
      setPack(await controlReviewApi.trustPack());
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the trust pack.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn, message) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await fn();
      setPack(updated);
      if (message) setNotice(message);
    } catch (err) {
      setError(err.response?.data?.message || 'That did not work.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <AppShell user={user} section="Trust pack">
        <div className="app-panel">Loading…</div>
      </AppShell>
    );
  }

  if (!pack) {
    return (
      <AppShell user={user} section="Trust pack">
        <div className="cr-alert cr-alert-error">{error}</div>
      </AppShell>
    );
  }

  return (
    <AppShell user={user} section="Trust pack" width="wide">
      <PageHeader
        eyebrow="Health & safety"
        title="Trust deployment pack"
        description="What is worth preparing, and what to tell workers, before any connector is switched on."
      />

      {error && <div className="cr-alert cr-alert-error">{error}</div>}
      {notice && <div className="cr-alert cr-alert-ok">{notice}</div>}

      <div className="cr-trust-status app-panel">
        <div>
          <h2>
            {pack.connectorsActivated ? 'Connectors are active' : 'Connectors are not active'}
          </h2>
          <p className="app-muted">
            {pack.connectorsActivated
              ? `Switched on ${formatDate(pack.acknowledgedAt)}. Data collection is running under the settings below.`
              : 'Nothing is collected until you switch this on. The checklist below is preparation material — it does not block you.'}
          </p>
          {pack.outstanding.length > 0 && (
            <p className="cr-meta">Not yet ticked: {pack.outstanding.join(', ')}</p>
          )}
        </div>
        {!pack.connectorsActivated && (
          <button
            type="button"
            className="cr-button cr-button-primary"
            disabled={busy}
            onClick={() => {
              // Recorded, not enforced. Informing workers is the employer's duty
              // as data controller; SignalTrue cannot verify it and does not
              // block on it. What gets stored is what was affirmed, and when.
              const confirmed = window.confirm(
                'Your organisation is responsible for informing workers about this processing and for confirming its own legal basis, as set out in your agreement. SignalTrue does not provide legal advice.\n\nYour answer and the date are recorded. Switch connectors on?'
              );
              if (!confirmed) return;
              run(() => controlReviewApi.activateConnectors(true), 'Connectors switched on.');
            }}
          >
            Switch connectors on
          </button>
        )}
      </div>

      <section className="app-panel">
        <h2>Deployment checklist</h2>
        <p className="app-muted">
          Preparation material, not a gate. Tick what applies, skip what your organisation already
          handles its own way — none of it blocks activation.
        </p>
        <ul className="cr-checklist">
          {pack.checklist.map((item) => (
            <li key={item.key} className={item.completed ? 'is-complete' : ''}>
              <label className="cr-checkbox">
                <input
                  type="checkbox"
                  checked={item.completed}
                  disabled={busy}
                  onChange={(e) =>
                    run(
                      () =>
                        controlReviewApi.updateTrustPackItem(item.key, {
                          completed: e.target.checked,
                        }),
                      null
                    )
                  }
                />
                <span>
                  <strong>{item.label}</strong>
                  <em className="cr-hint">{item.guidance}</em>
                  {item.completedAt && (
                    <em className="cr-meta">Completed {formatDate(item.completedAt)}</em>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <div className="cr-trust-grid">
        <section className="app-panel">
          <h2>What workers are told</h2>
          <h3>What SignalTrue collects</h3>
          <ul className="cr-plain-list">
            {pack.employeeExplanation.whatItCollects.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <h3>What it does not collect</h3>
          <ul className="cr-plain-list">
            {pack.employeeExplanation.whatItDoesNotCollect.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <h3>Why it is used</h3>
          <p>{pack.employeeExplanation.whyItIsUsed}</p>
          <h3>Who can see it</h3>
          <p>{pack.employeeExplanation.whoCanSeeIt}</p>
          <h3>Minimum group rule</h3>
          <p>{pack.employeeExplanation.minimumGroupRule}</p>
          <h3>What it is not used for</h3>
          <p>{pack.employeeExplanation.notUsedFor}</p>
        </section>

        <section className="app-panel">
          <h2>Data flow</h2>
          <ol className="cr-flow">
            {pack.dataFlow.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      </div>

      <section className="app-panel">
        <h2>Metadata dictionary</h2>
        <p className="app-muted">
          Exactly what is read from each connector, and what is explicitly excluded.
        </p>
        {pack.metadataDictionary.map((entry) => (
          <div key={entry.connector} className="cr-dictionary">
            <h3>{entry.connector}</h3>
            <div className="cr-dictionary-cols">
              <div>
                <span className="cr-meta">Ingested</span>
                <ul className="cr-plain-list">
                  {entry.ingested.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="cr-meta">Never ingested</span>
                <ul className="cr-plain-list cr-excluded">
                  {entry.excluded.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="app-panel">
        <h2>Where does this organisation operate?</h2>
        <p className="app-muted">
          The review process itself is the same everywhere. Only the deployment checkpoints change —
          what you must tell workers, who you must consult, and whose guidance to check against.
        </p>

        <label className="cr-field cr-jurisdiction-field">
          <span>Primary jurisdiction</span>
          <select
            value={pack.primaryJurisdiction || 'GLOBAL'}
            disabled={busy}
            onChange={(e) =>
              run(
                () =>
                  controlReviewApi.updateTrustConfiguration({
                    primaryJurisdiction: e.target.value,
                    jurisdictions: [e.target.value],
                  }),
                'Jurisdiction updated.'
              )
            }
          >
            {groupByRegion(pack.availableJurisdictions || []).map(([region, items]) => (
              <optgroup key={region} label={region}>
                {items.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <em className="cr-hint">
            Not listed? Leave it on “No specific jurisdiction configured” — you still get the
            universal checklist below.
          </em>
        </label>

        {pack.unrecognisedJurisdictions?.length > 0 && (
          <div className="cr-alert cr-alert-info">
            No checkpoint pack exists yet for {pack.unrecognisedJurisdictions.join(', ')}. The
            universal checklist below applies; add your local requirements alongside it.
          </div>
        )}

        <h3>Checkpoints for this deployment</h3>
        {pack.counselReviewNote && (
          <div className="cr-alert cr-alert-info">{pack.counselReviewNote}</div>
        )}
        <p className="app-muted">{pack.legalNote}</p>
        <ul className="cr-plain-list">
          {pack.jurisdictionCheckpoints.map((entry, index) => (
            <li key={index}>
              <strong>{entry.jurisdiction}</strong> — {entry.checkpoint}
            </li>
          ))}
        </ul>
      </section>

      <section className="app-panel">
        <h2>Settings</h2>
        <div className="cr-settings-grid">
          <div>
            <span className="cr-meta">Minimum group size</span>
            <p className="cr-status-value">{pack.minGroupSize}</p>
            <p className="cr-hint">
              Nothing is reported below this. The recommended deployment target is{' '}
              {pack.recommendedMinGroupSize} where the structure permits. This is a product privacy
              control, not a statement of legal sufficiency.
            </p>
          </div>
          <div>
            <span className="cr-meta">Default timezone</span>
            <p className="cr-status-value">{pack.defaultTimezone}</p>
          </div>
          <div>
            <span className="cr-meta">Primary jurisdiction</span>
            <p className="cr-status-value">{pack.primaryJurisdiction}</p>
          </div>
        </div>
        <div className="cr-retention">
          <span className="cr-meta">Retention</span>
          <ul className="cr-plain-list">
            <li>Work events: {pack.retention.workEventDays} days</li>
            <li>Aggregated metrics: {pack.retention.metricDays} days</li>
            <li>Case records: {pack.retention.caseRecordDays} days</li>
            <li>Audit events: {pack.retention.auditEventDays} days</li>
          </ul>
        </div>
        <div className="cr-purpose">
          <span className="cr-meta">Purpose statement</span>
          <p>{pack.purposeStatement}</p>
        </div>
      </section>

      <p className="cr-disclaimer">{pack.disclaimer}</p>
    </AppShell>
  );
}
