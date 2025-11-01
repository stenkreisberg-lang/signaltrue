import React, { useEffect, useState } from 'react';

// Simple color scale: red (low) to green (high)
function getColor(val, min, max) {
  if (val == null) return '#e5e7eb';
  const percent = (val - min) / (max - min);
  if (percent <= 0.33) return '#ef4444'; // red
  if (percent <= 0.66) return '#f59e42'; // orange
  return '#10b981'; // green
}

export default function TeamHeatmap({ teams }) {
  const [drivers, setDrivers] = useState([]);
  useEffect(() => {
    // Collect all driver keys
    const allDrivers = Array.from(new Set(
      teams.flatMap(t => Object.keys(t.driverWeights || {}))
    ));
    setDrivers(allDrivers);
  }, [teams]);

  // Find min/max for each driver for color scaling
  const driverStats = {};
  drivers.forEach(d => {
    const vals = teams.map(t => t.driverWeights?.[d]).filter(v => v != null);
    driverStats[d] = {
      min: Math.min(...vals),
      max: Math.max(...vals)
    };
  });

  return (
    <div style={{ overflowX: 'auto', margin: '24px 0' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 480 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px 12px', background: '#f3f4f6', fontWeight: 600 }}>Team</th>
            {drivers.map(d => (
              <th key={d} style={{ textAlign: 'center', padding: '8px 12px', background: '#f3f4f6', fontWeight: 600 }}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map(team => (
            <tr key={team._id}>
              <td style={{ padding: '8px 12px', fontWeight: 500 }}>{team.name}</td>
              {drivers.map(d => {
                const val = team.driverWeights?.[d];
                const color = getColor(val, driverStats[d].min, driverStats[d].max);
                return (
                  <td key={d} style={{ padding: '8px 12px', background: color, color: '#111827', textAlign: 'center', borderRadius: 6 }} title={val != null ? `Value: ${val}` : 'No data'}>
                    {val != null ? val : '-'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
