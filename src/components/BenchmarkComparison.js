import React, { useEffect, useState } from 'react';
import { API_BASE } from '../utils/api';

export default function BenchmarkComparison({ teamId, orgId }) {
  const [bench, setBench] = useState(null);
  const [peers, setPeers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBenchmarks() {
      try {
        if (teamId) {
          const res = await fetch(`${API_BASE}/api/benchmarks/team/${teamId}`);
          setBench(await res.json());
        }
        if (orgId) {
          const res = await fetch(`${API_BASE}/api/benchmarks/org/${orgId}`);
          const data = await res.json();
          setPeers(data.peers || []);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchBenchmarks();
  }, [teamId, orgId]);

  if (loading) return <div>Loading benchmarks...</div>;
  return (
    <div style={{ margin: '24px 0' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: 12 }}>Benchmark & Peer Comparison</h3>
      {bench && (
        <div style={{ marginBottom: 16 }}>
          <b>Your Team BDI:</b> {bench.team} <br/>
          <b>Org Avg BDI:</b> {bench.orgAvg}
        </div>
      )}
      {peers.length > 0 && (
        <div>
          <b>Peer Teams:</b>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {peers.map((p, i) => (
              <li key={i}>{p.name}: {p.bdi}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
