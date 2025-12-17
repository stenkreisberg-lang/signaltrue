import React from 'react';

// This is a visual mockup of the "Decision Support" dashboard style
// It uses inline styles for portability, but should be implemented with Tailwind/CSS modules.

const DashboardMockup = () => {
  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'Inter, sans-serif', padding: '40px' }}>
      
      {/* HEADER: High-level Org Pulse */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '1px solid #1e293b', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: 'white' }}>Team Execution Signals</h1>
          <p style={{ margin: '5px 0 0', color: '#94a3b8', fontSize: '14px' }}>
            3 Teams Monitored • Last updated: Today, 9:00 AM
          </p>
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Org Energy Index</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#34d399' }}>Stable (7.2/10)</div>
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px' }}>
        
        {/* LEFT COLUMN: The Decision Stream (Priority) */}
        <div>
          <h2 style={{ fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '20px' }}>
            Priority Signals & Recommendations
          </h2>

          {/* CARD 1: The "Drift" Scenario (Negative Signal + Playbook) */}
          <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', marginBottom: '24px', borderLeft: '4px solid #f59e0b', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '700' }}>Execution Drift Indicator</span>
                <span style={{ color: '#cbd5e1', fontWeight: '600' }}>Engineering Team</span>
              </div>
              <span style={{ color: '#64748b', fontSize: '13px' }}>Detected 2 days ago</span>
            </div>

            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '15px', fontStyle: 'italic' }}>
              This signal reflects aggregated changes in how work is coordinated, not individual performance.
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'white', margin: '0 0 15px 0' }}>
              Focus Time Erosion
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>The Signal (vs 3-Month Benchmark)</div>
                <div style={{ fontSize: '15px' }}>
                  Deep work blocks dropped by <span style={{ color: '#f87171', fontWeight: '700' }}>-40%</span> compared to Q3 average.
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>The Context</div>
                <div style={{ fontSize: '15px' }}>
                  <span style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.9em' }}>Context added: Reorganization (2 weeks ago)</span>
                </div>
              </div>
            </div>

            {/* THE MICRO PLAYBOOK */}
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
              <div style={{ color: '#34d399', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>
                Possible ways to reduce friction
              </div>
              <p style={{ margin: '0 0 15px 0', fontSize: '14px', lineHeight: '1.5' }}>
                Initiate a "Meeting Audit" for the Engineering team. Consider implementing a "No-Meeting Wednesday" to restore focus blocks.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button style={{ backgroundColor: '#059669', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                  Add to Action Plan
                </button>
                <button style={{ backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid #475569', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                  Dismiss (False Positive)
                </button>
              </div>
            </div>
          </div>

          {/* CARD 2: The "Good News" Scenario (Positive Reinforcement) */}
          <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', marginBottom: '24px', borderLeft: '4px solid #34d399' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ backgroundColor: 'rgba(52, 211, 153, 0.1)', color: '#34d399', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '700' }}>IMPROVEMENT</span>
                <span style={{ color: '#cbd5e1', fontWeight: '600' }}>Sales Team</span>
              </div>
              <span style={{ color: '#64748b', fontSize: '13px' }}>Detected today</span>
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'white', margin: '0 0 15px 0' }}>
              After-Hours Recovery
            </h3>

            <div style={{ fontSize: '15px', lineHeight: '1.5', marginBottom: '15px' }}>
              After-hours messaging volume has decreased by <span style={{ color: '#34d399', fontWeight: '700' }}>15%</span> following the "Disconnect Policy" rollout.
            </div>
            
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
              <em>SignalTrue Note: This suggests the policy is being adopted successfully.</em>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: The Data Context (Metrics) */}
        <div>
          <h2 style={{ fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '20px' }}>
            Team Metrics
          </h2>

          <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: 'white' }}>Meeting Load (Hours/Week)</h4>
            {/* Mock Chart Bar */}
            <div style={{ display: 'flex', alignItems: 'flex-end', height: '60px', gap: '8px', marginBottom: '10px' }}>
              <div style={{ width: '20%', height: '40%', background: '#334155', borderRadius: '2px' }}></div>
              <div style={{ width: '20%', height: '50%', background: '#334155', borderRadius: '2px' }}></div>
              <div style={{ width: '20%', height: '45%', background: '#334155', borderRadius: '2px' }}></div>
              <div style={{ width: '20%', height: '70%', background: '#334155', borderRadius: '2px' }}></div>
              <div style={{ width: '20%', height: '85%', background: '#f87171', borderRadius: '2px' }}></div>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'right' }}>Trending Up (+25%)</div>
          </div>

          <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: 'white' }}>Response Latency</h4>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '24px', fontWeight: '700' }}>24m</span>
              <span style={{ color: '#34d399', fontSize: '13px' }}>-5m vs last week</span>
            </div>
          </div>

          <div style={{ marginTop: '40px', padding: '20px', border: '1px dashed #334155', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#94a3b8' }}>Privacy & Aggregation</h4>
            <p style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.5', margin: 0 }}>
              All data displayed is aggregated at the team level (min. group size: 5). No individual messages or calendar events are accessible.
            </p>
            <p style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.5', marginTop: '10px', fontStyle: 'italic' }}>
              SignalTrue provides signals, not decisions.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardMockup;
