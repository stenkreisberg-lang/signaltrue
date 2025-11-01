import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import api from "./utils/api";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export default function Analytics({ projects }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let mounted = true;
    api
      .get("/api/analytics/summary")
      .then((data) => {
        if (mounted) setSummary(data);
      })
      .catch((_) => {
        // fallback to local derived stats from projects when API is unavailable
        const total = projects.length;
        const favorites = projects.filter((p) => p.favorite).length;
        const weeks = [];
        for (let i = 0; i < 8; i++) weeks.push({ week: i, count: 0 });
        const now = Date.now();
        projects.forEach((p) => {
          const created = new Date(p.createdAt).getTime();
          const diffWeeks = Math.floor((now - created) / (1000 * 60 * 60 * 24 * 7));
          if (diffWeeks < 8) weeks[diffWeeks].count += 1;
        });
        const barData = weeks.map((w, i) => ({ name: `-${i}w`, count: w.count })).reverse();
        setSummary({ totalProjects: total, favoriteCount: favorites, perWeek: barData.map((d, i) => ({ _id: i, count: d.count })), events: [] });
      });
    return () => { mounted = false };
  }, [projects]);

  if (!summary) return <div style={{ padding: 20 }}>Loading analytics…</div>;

  const total = summary.totalProjects;
  const favorites = summary.favoriteCount;
  const pieData = [
    { name: "Favorites", value: favorites },
    { name: "Others", value: total - favorites },
  ];
  const barData = (summary.perWeek || []).map((w, i) => ({ name: `-${7 - i}w`, count: w.count || 0 }));

  return (
    <div style={{ padding: 20 }}>
      <h2>Analytics</h2>
      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <h3>Summary</h3>
          <p>Total projects: {total}</p>
          <p>Favorites: {favorites} ({total ? Math.round((favorites / total) * 100) : 0}%)</p>
        </div>

        <div style={{ width: 300, height: 200 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie dataKey="value" data={pieData} outerRadius={80} fill="#8884d8" label>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ marginTop: 24, height: 240 }}>
        <h3>Projects added per week (last 8 weeks)</h3>
        <ResponsiveContainer>
          <BarChart data={barData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ marginTop: 24 }}>
        <h3>Recent analytics events</h3>
        <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #eee', padding: 8, borderRadius: 6 }}>
          {(summary.recentEvents || []).map((ev) => (
            <div key={ev._id} style={{ padding: 8, borderBottom: '1px solid #f4f4f4' }}>
              <div style={{ fontSize: 12, color: '#666' }}>{new Date(ev.createdAt).toLocaleString()}</div>
              <div style={{ fontWeight: 600 }}>{ev.eventName}</div>
              <pre style={{ margin: 0, fontSize: 12 }}>{JSON.stringify(ev.payload)}</pre>
            </div>
          ))}
          {(!summary.recentEvents || summary.recentEvents.length === 0) && <div style={{ color: '#666' }}>No recent events</div>}
        </div>
      </div>
    </div>
  );
}
