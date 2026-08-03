import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell, { PageHeader } from '../../components/app/AppShell';
import api from '../../utils/api';
import { getAuthenticatedContext } from '../../utils/authContext';

const LEADERSHIP_ROLES = ['master_admin', 'admin', 'hr_admin', 'org_admin', 'executive'];

function pct(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function trend(value) {
  if (value == null) return 'No comparable base';
  return `${value > 0 ? '+' : ''}${value}% vs prior period`;
}

function badgeClass(severity) {
  if (severity === 'high') return 'bg-red-100 text-red-800';
  if (severity === 'medium') return 'bg-amber-100 text-amber-800';
  return 'bg-slate-100 text-slate-700';
}

function buildPositions(nodes) {
  const width = 920;
  const height = 520;
  const centerX = width / 2;
  const centerY = height / 2;
  const radiusX = Math.min(350, 220 + nodes.length * 7);
  const radiusY = Math.min(190, 130 + nodes.length * 5);
  return new Map(
    nodes.map((node, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / Math.max(nodes.length, 1);
      return [
        node.id,
        {
          x: centerX + radiusX * Math.cos(angle),
          y: centerY + radiusY * Math.sin(angle),
        },
      ];
    })
  );
}

function NetworkMap({ nodes, formalEdges, actualEdges, ready }) {
  const visibleNodes = useMemo(() => nodes.slice(0, 16), [nodes]);
  const positions = useMemo(() => buildPositions(visibleNodes), [visibleNodes]);
  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const maxUnits = Math.max(1, ...actualEdges.map((edge) => edge.interactionUnits));

  if (!visibleNodes.length) {
    return <p className="app-muted">No privacy-eligible teams are available for the map.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox="0 0 920 520"
        className="min-w-[760px] w-full"
        role="img"
        aria-label="Formal reporting and observed coordination links between teams"
      >
        <rect x="0" y="0" width="920" height="520" rx="24" fill="#f8fafc" />
        {formalEdges
          .filter((edge) => visibleIds.has(edge.teamAId) && visibleIds.has(edge.teamBId))
          .map((edge) => {
            const from = positions.get(edge.teamAId);
            const to = positions.get(edge.teamBId);
            return (
              <line
                key={edge.id}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#94a3b8"
                strokeWidth="2"
                strokeDasharray="7 7"
              />
            );
          })}
        {ready &&
          actualEdges
            .filter((edge) => visibleIds.has(edge.teamAId) && visibleIds.has(edge.teamBId))
            .map((edge) => {
              const from = positions.get(edge.teamAId);
              const to = positions.get(edge.teamBId);
              const width = 2 + (edge.interactionUnits / maxUnits) * 8;
              return (
                <line
                  key={edge.id}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={edge.formalConnection ? '#0f766e' : '#d97706'}
                  strokeWidth={width}
                  strokeLinecap="round"
                  opacity="0.72"
                >
                  <title>
                    {edge.teamAName} to {edge.teamBName}: {edge.interactionUnits} interaction units
                  </title>
                </line>
              );
            })}
        {visibleNodes.map((node) => {
          const position = positions.get(node.id);
          const load = Math.min(1, node.outsideTeamShare || 0);
          const fill = load >= 0.6 ? '#0f766e' : load >= 0.3 ? '#0e7490' : '#334155';
          const shortName = node.name.length > 20 ? `${node.name.slice(0, 18)}...` : node.name;
          return (
            <g key={node.id} transform={`translate(${position.x} ${position.y})`}>
              <circle r="43" fill="#ffffff" stroke={fill} strokeWidth="4" />
              <text textAnchor="middle" y="-7" fontSize="13" fontWeight="700" fill="#0f172a">
                {shortName}
              </text>
              <text textAnchor="middle" y="12" fontSize="11" fill="#475569">
                {ready ? `${pct(node.outsideTeamShare)} outside` : `${node.memberCount} mapped`}
              </text>
              <title>
                {node.name}. {node.memberCount} mapped members.{' '}
                {ready
                  ? `${pct(node.outsideTeamShare)} of measured interaction is outside the team.`
                  : ''}
              </title>
            </g>
          );
        })}
      </svg>
      {nodes.length > visibleNodes.length && (
        <p className="mt-2 text-xs text-slate-500">
          The map shows the 16 teams with the most measured cross-team activity. All eligible teams
          remain included in the tables and calculations.
        </p>
      )}
    </div>
  );
}

function ReadinessNotice({ readiness }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Setup required</p>
      <h2 className="mt-2 text-xl font-bold text-slate-900">Observed network is paused</h2>
      <p className="mt-2 text-sm text-slate-700">
        The formal team structure remains visible, but SignalTrue will not infer working
        relationships or bottlenecks until coverage is reliable.
      </p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">
          User mapping {pct(readiness.mappingCoverage)}
        </span>
        <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">
          Event mapping {pct(readiness.eventMappingCoverage)}
        </span>
        <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">
          {readiness.interactionEvents} events
        </span>
      </div>
      {readiness.reasons?.length > 0 && (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {readiness.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      <Link
        to="/app/employees"
        className="mt-4 inline-flex rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white no-underline hover:bg-amber-800"
      >
        Fix team mapping
      </Link>
    </div>
  );
}

export default function WorkNetwork() {
  const [user, setUser] = useState(null);
  const [network, setNetwork] = useState(null);
  const [days, setDays] = useState(28);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tracked, setTracked] = useState({});

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([getAuthenticatedContext(), api.get('/work-network', { params: { days } })])
      .then(([context, response]) => {
        if (!active) return;
        setUser(context.user);
        setNetwork(response.data);
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || 'The Work Network is unavailable.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [days]);

  const trackAction = async (insight) => {
    setTracked((current) => ({ ...current, [insight.id]: 'saving' }));
    try {
      const response = await api.post('/work-network/actions', { insightId: insight.id, days });
      setTracked((current) => ({
        ...current,
        [insight.id]: response.data.message || 'Action is being tracked.',
      }));
    } catch (requestError) {
      setTracked((current) => ({
        ...current,
        [insight.id]: requestError.response?.data?.message || 'Could not track this action.',
      }));
    }
  };

  const canView = LEADERSHIP_ROLES.includes(user?.role);
  const readiness = network?.readiness;

  return (
    <AppShell user={user} section="Work Network">
      <PageHeader
        eyebrow="Actual organization map"
        title="How work really moves between teams"
        description="Compare formal reporting links with observed team-to-team coordination. Metadata only, team-level, and action-oriented."
        action={
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            Period
            <select
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2"
            >
              <option value={14}>14 days</option>
              <option value={28}>28 days</option>
              <option value={42}>42 days</option>
              <option value={90}>90 days</option>
            </select>
          </label>
        }
      />

      {loading && <div className="app-panel">Building the team-level work network...</div>}
      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">{error}</div>
      )}
      {!loading && !error && !canView && (
        <div className="app-panel">
          <h2>Leadership access required</h2>
          <p className="app-muted">The organization-level work network is restricted.</p>
        </div>
      )}

      {!loading && !error && canView && network && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {[
              ['Measured teams', network.summary.measuredTeams],
              ['Observed links', network.summary.observedConnections],
              ['Hidden links', network.summary.hiddenDependencies],
              ['Concentrated', network.summary.concentratedInterfaces],
              ['Confidence', network.confidence.label],
            ].map(([label, value]) => (
              <div key={label} className="app-dashboard-card">
                <span className="app-dashboard-card-value">{value}</span>
                <span className="app-dashboard-card-label">{label}</span>
              </div>
            ))}
          </div>

          {!readiness.ready && <ReadinessNotice readiness={readiness} />}

          <section className="app-panel">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="app-eyebrow">Formal vs. observed</p>
                <h2 className="text-2xl font-bold text-slate-900">Company work network</h2>
                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Dashed lines are formal cross-team reporting links. Teal lines are observed links
                  that align with formal structure. Amber lines are real operating dependencies not
                  explained by the reporting map.
                </p>
              </div>
              <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                {network.period.days}-day window · {network.confidence.score}/100 confidence
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
              <span>
                <span className="mr-2 inline-block w-8 border-t-2 border-dashed border-slate-400" />
                Formal
              </span>
              <span>
                <span className="mr-2 inline-block h-1 w-8 rounded bg-teal-700" />
                Aligned actual
              </span>
              <span>
                <span className="mr-2 inline-block h-1 w-8 rounded bg-amber-600" />
                Hidden actual
              </span>
            </div>
            <div className="mt-4">
              <NetworkMap
                nodes={network.nodes}
                formalEdges={network.formalEdges}
                actualEdges={network.actualEdges}
                ready={readiness.ready}
              />
            </div>
          </section>

          {readiness.ready && (
            <section className="app-panel">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="app-eyebrow">Strongest interfaces</p>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Where teams depend on each other
                  </h2>
                </div>
                <span className="text-xs text-slate-500">Previous {days} days used for trend</span>
              </div>
              {network.actualEdges.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">
                  No team-pair link met the five-contributor privacy threshold in this period.
                </p>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-3">Interface</th>
                        <th className="px-3 py-3">Structure</th>
                        <th className="px-3 py-3">Meetings</th>
                        <th className="px-3 py-3">Directed</th>
                        <th className="px-3 py-3">Concentration</th>
                        <th className="px-3 py-3">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {network.actualEdges.slice(0, 12).map((edge) => (
                        <tr key={edge.id} className="border-b border-slate-100 text-slate-700">
                          <td className="px-3 py-4 font-semibold text-slate-900">
                            {edge.teamAName} ↔ {edge.teamBName}
                          </td>
                          <td className="px-3 py-4">
                            {edge.formalConnection ? 'Formally linked' : 'Hidden dependency'}
                          </td>
                          <td className="px-3 py-4">
                            {edge.meetingCount} · {edge.meetingHours}h
                          </td>
                          <td className="px-3 py-4">
                            {edge.messageCount + edge.otherInteractionCount}
                          </td>
                          <td className="px-3 py-4">{pct(edge.bridgeConcentration)}</td>
                          <td className="px-3 py-4">{trend(edge.trendPct)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {readiness.ready && (
            <section>
              <div className="mb-4">
                <p className="app-eyebrow">Decision queue</p>
                <h2 className="text-2xl font-bold text-slate-900">Bottlenecks worth acting on</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Relative to this company’s own network, with one reversible action and a 14-day
                  measure. These are structural patterns, not employee performance findings.
                </p>
              </div>
              {network.insights.length === 0 ? (
                <div className="app-panel">
                  <h3 className="text-lg font-semibold text-slate-900">
                    No material bottleneck detected
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Measured interfaces do not currently meet the evidence rules for action.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {network.insights.map((insight) => (
                    <article key={insight.id} className="app-panel">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-bold text-slate-900">{insight.title}</h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${badgeClass(insight.severity)}`}
                        >
                          {insight.severity}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700">{insight.summary}</p>
                      <div className="mt-4 rounded-lg bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Evidence
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                          {insight.evidence.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="mt-4 border-l-4 border-teal-600 pl-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-teal-800">
                          14-day action
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {insight.action.action}
                        </p>
                        <p className="mt-2 text-sm text-slate-600">
                          <strong>Owner:</strong> {insight.action.owner}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          <strong>Measure:</strong> {insight.action.measure}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => trackAction(insight)}
                        disabled={Boolean(tracked[insight.id] || insight.tracking)}
                        className="mt-5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-default disabled:bg-slate-400"
                      >
                        {tracked[insight.id] === 'saving'
                          ? 'Adding...'
                          : tracked[insight.id] ||
                            (insight.tracking
                              ? `Tracked · review ${new Date(insight.tracking.recheckDate).toLocaleDateString()}`
                              : 'Track this action')}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            <strong className="text-slate-900">Privacy and interpretation:</strong>{' '}
            {network.privacy.note} Team-pair metrics require at least{' '}
            {network.privacy.minimumContributors} contributors. A line means observed coordination,
            not communication quality, sentiment, or causation.
          </section>
        </div>
      )}
    </AppShell>
  );
}
