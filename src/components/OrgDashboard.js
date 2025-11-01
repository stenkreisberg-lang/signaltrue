import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function OrgDashboard({ teams, dark }) {
  const [expanded, setExpanded] = useState(false);

  // Calculate zone distribution
  const zoneDistribution = React.useMemo(() => {
    const zones = { Recovery: 0, Stable: 0, Watch: 0, Surge: 0 };
    teams.forEach(team => {
      if (zones[team.zone] !== undefined) {
        zones[team.zone]++;
      }
    });
    return [
      { name: 'Recovery', value: zones.Recovery, color: '#22c55e' },
      { name: 'Stable', value: zones.Stable, color: '#3b82f6' },
      { name: 'Watch', value: zones.Watch, color: '#f59e0b' },
      { name: 'Surge', value: zones.Surge, color: '#ef4444' },
    ].filter(z => z.value > 0); // Only show zones with teams
  }, [teams]);

  // Prepare team comparison data
  const teamComparison = React.useMemo(() => {
    return teams
      .map(team => ({
        name: team.name,
        bdi: team.bdi,
        trend: team.trend,
      }))
      .sort((a, b) => b.bdi - a.bdi) // Sort by BDI (highest first)
      .slice(0, 10); // Top 10 teams
  }, [teams]);

  // Calculate org-level stats
  const orgStats = React.useMemo(() => {
    if (teams.length === 0) return { avgBdi: 0, totalTeams: 0, atRisk: 0 };
    
    const totalBdi = teams.reduce((sum, t) => sum + t.bdi, 0);
    const avgBdi = Math.round(totalBdi / teams.length);
    const atRisk = teams.filter(t => t.zone === 'Surge' || t.zone === 'Watch').length;
    
    return { avgBdi, totalTeams: teams.length, atRisk };
  }, [teams]);

  const containerStyle = {
    backgroundColor: dark ? '#1f2937' : '#ffffff',
    borderRadius: '16px',
    padding: expanded ? '24px' : '16px',
    marginBottom: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease',
    cursor: expanded ? 'default' : 'pointer',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: expanded ? '24px' : '0',
  };

  const titleStyle = {
    fontSize: expanded ? '24px' : '20px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    transition: 'all 0.3s ease',
  };

  const statsRowStyle = {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  };

  const statCardStyle = {
    flex: '1',
    minWidth: '120px',
    padding: '12px',
    borderRadius: '12px',
    backgroundColor: dark ? '#374151' : '#f9fafb',
    border: `1px solid ${dark ? '#4b5563' : '#e5e7eb'}`,
  };

  const statLabelStyle = {
    fontSize: '11px',
    color: dark ? '#9ca3af' : '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  };

  const statValueStyle = {
    fontSize: '20px',
    fontWeight: 'bold',
    color: dark ? '#f3f4f6' : '#111827',
  };

  const chartsContainerStyle = {
    display: 'grid',
    gridTemplateColumns: expanded ? 'repeat(auto-fit, minmax(400px, 1fr))' : '1fr',
    gap: '24px',
    marginTop: '24px',
  };

  const chartCardStyle = {
    backgroundColor: dark ? '#374151' : '#f9fafb',
    borderRadius: '12px',
    padding: '20px',
    border: `1px solid ${dark ? '#4b5563' : '#e5e7eb'}`,
  };

  const chartTitleStyle = {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '16px',
    color: dark ? '#f3f4f6' : '#111827',
  };

  return (
    <div 
      style={containerStyle} 
      onClick={() => !expanded && setExpanded(true)}
    >
      <div style={headerStyle}>
        <h2 style={titleStyle}>📊 Organization Overview</h2>
        {expanded && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(false);
            }}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: dark ? '#9ca3af' : '#6b7280',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {expanded ? (
        <>
          <div style={statsRowStyle}>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Total Teams</div>
              <div style={statValueStyle}>{orgStats.totalTeams}</div>
            </div>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Org Avg BDI</div>
              <div style={statValueStyle}>{orgStats.avgBdi}</div>
            </div>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>At Risk</div>
              <div style={{ ...statValueStyle, color: orgStats.atRisk > 0 ? '#ef4444' : '#22c55e' }}>
                {orgStats.atRisk}
              </div>
            </div>
          </div>

          <div style={chartsContainerStyle}>
            {/* Zone Distribution Pie Chart */}
            <div style={chartCardStyle}>
              <h3 style={chartTitleStyle}>Zone Distribution</h3>
              {zoneDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={zoneDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {zoneDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: dark ? '#374151' : '#ffffff',
                        border: `1px solid ${dark ? '#4b5563' : '#e5e7eb'}`,
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: dark ? '#9ca3af' : '#6b7280' }}>
                  No team data available
                </div>
              )}
            </div>

            {/* Team Comparison Bar Chart */}
            <div style={chartCardStyle}>
              <h3 style={chartTitleStyle}>Team BDI Comparison</h3>
              {teamComparison.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={teamComparison} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#374151' : '#e5e7eb'} />
                    <XAxis type="number" domain={[0, 100]} stroke={dark ? '#9ca3af' : '#6b7280'} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100}
                      stroke={dark ? '#9ca3af' : '#6b7280'}
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: dark ? '#374151' : '#ffffff',
                        border: `1px solid ${dark ? '#4b5563' : '#e5e7eb'}`,
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="bdi" fill="#6366f1" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: dark ? '#9ca3af' : '#6b7280' }}>
                  No team data available
                </div>
              )}
            </div>
          </div>

          <div style={{ 
            marginTop: '24px', 
            padding: '12px', 
            backgroundColor: dark ? '#1f2937' : '#f9fafb',
            borderRadius: '8px',
            fontSize: '13px',
            color: dark ? '#d1d5db' : '#4b5563',
            border: `1px solid ${dark ? '#374151' : '#e5e7eb'}`,
          }}>
            💡 <strong>Tip:</strong> Click on individual team cards below to view detailed timelines and AI-powered playbooks.
          </div>
        </>
      ) : (
        <div style={{ 
          display: 'flex', 
          gap: '24px', 
          alignItems: 'center',
          color: dark ? '#9ca3af' : '#6b7280',
          fontSize: '14px',
        }}>
          <span>{orgStats.totalTeams} teams • Avg BDI: {orgStats.avgBdi}</span>
          <span style={{ color: orgStats.atRisk > 0 ? '#ef4444' : '#22c55e' }}>
            {orgStats.atRisk} at risk
          </span>
          <span style={{ marginLeft: 'auto', fontSize: '12px' }}>Click to expand ↓</span>
        </div>
      )}
    </div>
  );
}
