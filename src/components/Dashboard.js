import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TeamCard from './TeamCard';
import PlaybookSidebar from './PlaybookSidebar';
import OrgDashboard from './OrgDashboard';
import TeamMembers from './TeamMembers';
import TeamHeatmap from './TeamHeatmap';

export default function Dashboard() {
  const [teams, setTeams] = useState([]);
  const [playbook, setPlaybook] = useState('');
  const [dark, setDark] = useState(false);
  const [model, setModel] = useState(process.env.REACT_APP_DEFAULT_MODEL || 'gpt-3.5-turbo');
  const [sortBy, setSortBy] = useState('latest');
  const [baselines, setBaselines] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get current user from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);
    
    // Set axios base and auth header
    axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    fetchTeams();
  }, []);

  async function fetchTeams() {
    try {
      // Fetch only the user's team
      const res = await axios.get('/api/teams');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Filter to only show the user's team
      const userTeam = res.data.filter(team => team._id === user.teamId);
      setTeams(userTeam);
      
      // Fetch baseline comparisons
      const baselineData = {};
      for (const team of userTeam) {
        try {
          const baselineRes = await axios.get(`/api/teams/${team._id}/baseline-comparison`);
          baselineData[team._id] = baselineRes.data;
        } catch (err) {
          baselineData[team._id] = null;
        }
      }
      setBaselines(baselineData);
    } catch (err) {
      console.error('Error fetching teams:', err);
      // If unauthorized, redirect to login
      if (err.response?.status === 401) {
        handleLogout();
      }
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    navigate('/login');
  }

  // debounce analyze to avoid accidental duplicates
  let analyzeTimer = null;
  function analyze(teamId) {
    if (analyzeTimer) clearTimeout(analyzeTimer);
    analyzeTimer = setTimeout(async () => {
      const team = teams.find(t => t._id === teamId);
      const res = await axios.post('/api/analyze', { teamId, context: JSON.stringify(team), model });
      setPlaybook(res.data.playbook);
      analyzeTimer = null;
    }, 350);
  }

  // apply sorting
  const sorted = [...teams];
  if (sortBy === 'latest') sorted.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  else if (sortBy === 'favorites') sorted.sort((a,b) => (b.favorite === true) - (a.favorite === true));

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: dark 
        ? 'linear-gradient(135deg, #111827, #1f2937, #111827)' 
        : 'linear-gradient(135deg, #eef2ff, #faf5ff, #fce7f3)',
      color: dark ? 'white' : '#111827',
      transition: 'all 0.5s'
    }}>
      <main style={{ flex: 1, padding: '24px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ 
              fontSize: '30px', 
              fontWeight: 'bold', 
              marginBottom: '8px',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              SignalTrue Dashboard
            </h1>
            <p style={{ fontSize: '14px', color: dark ? '#9ca3af' : '#6b7280' }}>
              Performance rhythm monitoring for your organization
            </p>
          </div>
          <div style={{
            padding: '12px 20px',
            borderRadius: '12px',
            backgroundColor: dark ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.5)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            {currentUser?.isMasterAdmin && (
              <button
                onClick={() => navigate('/master-admin')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  color: 'white',
                  border: 'none',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  marginRight: '8px'
                }}
              >
                👑 Master Admin
              </button>
            )}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>{currentUser?.name}</div>
              <div style={{ fontSize: '12px', color: dark ? '#9ca3af' : '#6b7280' }}>
                {currentUser?.isMasterAdmin ? '👑 Master Admin' : currentUser?.role === 'admin' ? '👑 Admin' : '👁️ Viewer'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: dark ? '1px solid #4b5563' : '1px solid #d1d5db',
                backgroundColor: dark ? '#374151' : 'white',
                color: dark ? 'white' : '#111827',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px', 
          padding: '16px', 
          borderRadius: '12px', 
          backgroundColor: dark ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <label style={{ fontSize: '14px', fontWeight: '500', color: dark ? '#d1d5db' : '#374151' }}>Sort:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: dark ? '1px solid #4b5563' : '1px solid #d1d5db',
                backgroundColor: dark ? '#374151' : 'white',
                color: dark ? 'white' : '#111827',
                fontSize: '14px'
              }}
            >
              <option value="latest">Latest</option>
              <option value="favorites">Favorites</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <select 
              value={model} 
              onChange={(e) => setModel(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: dark ? '1px solid #4b5563' : '1px solid #d1d5db',
                backgroundColor: dark ? '#374151' : 'white',
                color: dark ? 'white' : '#111827',
                fontSize: '14px'
              }}
            >
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
            </select>

            <button 
              onClick={() => setDark(!dark)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                color: 'white',
                border: 'none',
                fontWeight: '500',
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #4f46e5, #9333ea)';
                e.currentTarget.style.boxShadow = '0 10px 15px -1px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #6366f1, #a855f7)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
              }}
            >
              {dark ? '🌞 Light' : '🌙 Dark'}
            </button>
          </div>
        </div>

        {/* Organization Overview */}
        <OrgDashboard teams={teams} dark={dark} />

        {/* Team Members Management */}
        <TeamMembers />

        {/* Team Heatmap Visualization */}
        <TeamHeatmap teams={teams} />

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: '24px',
          marginTop: '24px'
        }}>
          {sorted.map(team => (
            <TeamCard 
              key={team._id} 
              team={team} 
              baseline={baselines[team._id]}
              onAnalyze={analyze} 
              dark={dark} 
            />
          ))}
        </div>
      </main>
      <PlaybookSidebar playbook={playbook} dark={dark} />
    </div>
  );
}
