import React from 'react';

/**
 * Intelligence Widgets
 * Compact components for displaying behavioral intelligence metrics
 * Used in Insights page and Overview page
 */

export function NetworkHealthWidget({ data }) {
  if (!data) return null;

  return (
    <div style={styles.widget}>
      <div style={styles.widgetHeader}>
        <span style={styles.widgetIcon}>🔗</span>
        <span style={styles.widgetTitle}>Network Health</span>
      </div>
      <div style={styles.widgetContent}>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Silo Score:</span>
          <span style={getSiloScoreStyle(data.siloScore)}>
            {data.siloScore}/100
          </span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Bottlenecks:</span>
          <span style={styles.metricValue}>{data.bottlenecks?.length || 0}</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Isolated Members:</span>
          <span style={styles.metricValue}>{data.isolatedMembers?.length || 0}</span>
        </div>
      </div>
    </div>
  );
}

export function SuccessionRiskWidget({ data }) {
  if (!data) return null;

  return (
    <div style={styles.widget}>
      <div style={styles.widgetHeader}>
        <span style={styles.widgetIcon}>🎯</span>
        <span style={styles.widgetTitle}>Succession Risk</span>
      </div>
      <div style={styles.widgetContent}>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Bus Factor:</span>
          <span style={getBusFactorStyle(data.busFactor)}>
            {data.busFactor}/100
          </span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Critical Roles:</span>
          <span style={styles.metricValue}>{data.criticalRoles?.length || 0}</span>
        </div>
        {data.criticalRoles && data.criticalRoles.length > 0 && (
          <div style={styles.warning}>
            ⚠️ {data.criticalRoles[0].personName} holds {data.criticalRoles[0].knowledgePercentage}% of critical knowledge
          </div>
        )}
      </div>
    </div>
  );
}

export function EquitySignalsWidget({ data }) {
  if (!data) return null;

  return (
    <div style={styles.widget}>
      <div style={styles.widgetHeader}>
        <span style={styles.widgetIcon}>⚖️</span>
        <span style={styles.widgetTitle}>Equity Signals</span>
      </div>
      <div style={styles.widgetContent}>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Response Time Equity:</span>
          <span style={getEquityScoreStyle(data.responseTimeEquity?.equityScore)}>
            {data.responseTimeEquity?.equityScore || 100}/100
          </span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Participation Equity:</span>
          <span style={getEquityScoreStyle(data.participationEquity?.equityScore)}>
            {data.participationEquity?.equityScore || 100}/100
          </span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Voice Equity:</span>
          <span style={getEquityScoreStyle(data.voiceEquity?.equityScore)}>
            {data.voiceEquity?.equityScore || 100}/100
          </span>
        </div>
      </div>
    </div>
  );
}

export function ProjectRiskWidget({ data }) {
  if (!data || !data.projects) return null;

  const highRiskProjects = data.projects.filter(p => p.riskScore >= 60);

  return (
    <div style={styles.widget}>
      <div style={styles.widgetHeader}>
        <span style={styles.widgetIcon}>📊</span>
        <span style={styles.widgetTitle}>Project Risk</span>
      </div>
      <div style={styles.widgetContent}>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Total Projects:</span>
          <span style={styles.metricValue}>{data.projects.length}</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>High Risk:</span>
          <span style={highRiskProjects.length > 0 ? styles.metricDanger : styles.metricValue}>
            {highRiskProjects.length}
          </span>
        </div>
        {highRiskProjects.length > 0 && (
          <div style={styles.projectList}>
            {highRiskProjects.slice(0, 2).map((project, idx) => (
              <div key={idx} style={styles.projectItem}>
                {project.projectName} ({project.riskScore}/100)
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function MeetingROIWidget({ data }) {
  if (!data || !data.meetings) return null;

  const lowROIMeetings = data.meetings.filter(m => m.roiScore < 40);
  const avgROI = data.meetings.reduce((sum, m) => sum + m.roiScore, 0) / data.meetings.length;

  return (
    <div style={styles.widget}>
      <div style={styles.widgetHeader}>
        <span style={styles.widgetIcon}>📅</span>
        <span style={styles.widgetTitle}>Meeting ROI</span>
      </div>
      <div style={styles.widgetContent}>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Average ROI:</span>
          <span style={getROIScoreStyle(avgROI)}>
            {avgROI.toFixed(0)}/100
          </span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Low ROI Meetings:</span>
          <span style={lowROIMeetings.length > 0 ? styles.metricWarning : styles.metricValue}>
            {lowROIMeetings.length}
          </span>
        </div>
        {lowROIMeetings.length > 0 && (
          <div style={styles.warning}>
            ⚠️ {lowROIMeetings.length} meetings showing poor post-meeting action
          </div>
        )}
      </div>
    </div>
  );
}

export function OutlookSignalsWidget({ data }) {
  if (!data) return null;

  const overloadCount = data.signals?.filter(s => s.overloadDetected)?.length || 0;

  return (
    <div style={styles.widget}>
      <div style={styles.widgetHeader}>
        <span style={styles.widgetIcon}>📧</span>
        <span style={styles.widgetTitle}>Outlook Signals</span>
      </div>
      <div style={styles.widgetContent}>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Avg Email Volume:</span>
          <span style={styles.metricValue}>{data.avgEmailVolume || 0}/day</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>After-Hours Rate:</span>
          <span style={styles.metricValue}>{data.avgAfterHoursRate || 0}%</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Overload Detected:</span>
          <span style={overloadCount > 0 ? styles.metricDanger : styles.metricValue}>
            {overloadCount} people
          </span>
        </div>
      </div>
    </div>
  );
}

export function AttritionRiskSummary({ data }) {
  if (!data) return null;

  return (
    <div style={styles.widget}>
      <div style={styles.widgetHeader}>
        <span style={styles.widgetIcon}>🚨</span>
        <span style={styles.widgetTitle}>Attrition Risk</span>
      </div>
      <div style={styles.widgetContent}>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>High Risk:</span>
          <span style={data.highRiskCount > 0 ? styles.metricDanger : styles.metricValue}>
            {data.highRiskCount || 0} members
          </span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Critical Risk:</span>
          <span style={data.criticalRiskCount > 0 ? styles.metricDanger : styles.metricValue}>
            {data.criticalRiskCount || 0} members
          </span>
        </div>
        {(data.highRiskCount > 0 || data.criticalRiskCount > 0) && (
          <div style={styles.warning}>
            ⚠️ Contact HR for retention strategy
          </div>
        )}
      </div>
    </div>
  );
}

// Helper style functions
function getSiloScoreStyle(score) {
  if (score >= 70) {
    return { ...styles.metricValue, color: '#dc2626', fontWeight: '700' };
  } else if (score >= 50) {
    return { ...styles.metricValue, color: '#f59e0b', fontWeight: '700' };
  }
  return { ...styles.metricValue, color: '#10b981', fontWeight: '700' };
}

function getBusFactorStyle(score) {
  if (score < 40) {
    return { ...styles.metricValue, color: '#dc2626', fontWeight: '700' };
  } else if (score < 60) {
    return { ...styles.metricValue, color: '#f59e0b', fontWeight: '700' };
  }
  return { ...styles.metricValue, color: '#10b981', fontWeight: '700' };
}

function getEquityScoreStyle(score) {
  if (score < 60) {
    return { ...styles.metricValue, color: '#dc2626', fontWeight: '700' };
  } else if (score < 80) {
    return { ...styles.metricValue, color: '#f59e0b', fontWeight: '700' };
  }
  return { ...styles.metricValue, color: '#10b981', fontWeight: '700' };
}

function getROIScoreStyle(score) {
  if (score < 40) {
    return { ...styles.metricValue, color: '#dc2626', fontWeight: '700' };
  } else if (score < 60) {
    return { ...styles.metricValue, color: '#f59e0b', fontWeight: '700' };
  }
  return { ...styles.metricValue, color: '#10b981', fontWeight: '700' };
}

const styles = {
  widget: {
    background: '#1e293b',
    borderRadius: '8px',
    padding: '1.25rem',
    border: '1px solid #334155',
  },
  widgetHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid #334155',
  },
  widgetIcon: {
    fontSize: '1.5rem',
  },
  widgetTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'white',
  },
  widgetContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  metric: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: '0.875rem',
    color: '#94a3b8',
  },
  metricValue: {
    fontSize: '0.875rem',
    color: '#e2e8f0',
    fontWeight: '600',
  },
  metricDanger: {
    fontSize: '0.875rem',
    color: '#dc2626',
    fontWeight: '700',
  },
  metricWarning: {
    fontSize: '0.875rem',
    color: '#f59e0b',
    fontWeight: '700',
  },
  warning: {
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: '4px',
    padding: '0.5rem',
    fontSize: '0.8rem',
    color: '#fbbf24',
    marginTop: '0.5rem',
  },
  projectList: {
    marginTop: '0.5rem',
  },
  projectItem: {
    fontSize: '0.8rem',
    color: '#cbd5e1',
    padding: '0.25rem 0',
    borderLeft: '2px solid #f59e0b',
    paddingLeft: '0.5rem',
    marginBottom: '0.25rem',
  },
};
