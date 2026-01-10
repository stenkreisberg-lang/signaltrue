import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

/**
 * Crisis Alert Banner
 * Real-time banner that appears when crisis detected
 * Highest priority alert - team collapse, mass exodus, conflict spike
 */
export default function CrisisAlertBanner({ orgId }) {
  const [crises, setCrises] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    
    fetchCrises();
    
    // Poll every 30 seconds for real-time updates
    const interval = setInterval(fetchCrises, 30000);
    return () => clearInterval(interval);
  }, [orgId]);

  const fetchCrises = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/intelligence/crisis/${orgId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCrises(response.data.crises || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching crisis alerts:', error);
      setLoading(false);
    }
  };

  const handleAcknowledge = async (crisisId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/intelligence/crisis/${crisisId}/acknowledge`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchCrises(); // Refresh
    } catch (error) {
      console.error('Error acknowledging crisis:', error);
      alert('Failed to acknowledge crisis. Please try again.');
    }
  };

  const handleResolve = async (crisisId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/intelligence/crisis/${crisisId}/resolve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchCrises(); // Refresh
    } catch (error) {
      console.error('Error resolving crisis:', error);
      alert('Failed to resolve crisis. Please try again.');
    }
  };

  // Don't show banner if no active crises
  if (loading || crises.length === 0) {
    return null;
  }

  return (
    <div style={styles.container}>
      {crises.map(crisis => (
        <div key={crisis._id} style={getSeverityStyle(crisis.severity)}>
          <div style={styles.content}>
            <div style={styles.icon}>🚨</div>
            <div style={styles.details}>
              <div style={styles.title}>
                {getCrisisTitle(crisis.crisisType)} - {crisis.teamId?.name || 'Team'}
              </div>
              <div style={styles.description}>
                {crisis.description}
              </div>
              <div style={styles.meta}>
                Severity: <strong>{crisis.severity}</strong> | 
                Confidence: <strong>{crisis.confidence}%</strong> | 
                Detected: {new Date(crisis.detectedAt).toLocaleString()}
              </div>
            </div>
            <div style={styles.actions}>
              {!crisis.acknowledgedAt && (
                <button
                  onClick={() => handleAcknowledge(crisis._id)}
                  style={styles.btnAcknowledge}
                >
                  Acknowledge
                </button>
              )}
              <button
                onClick={() => handleResolve(crisis._id)}
                style={styles.btnResolve}
              >
                Mark Resolved
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function getCrisisTitle(type) {
  const titles = {
    'team-collapse': '⚠️ Team Collapse Detected',
    'mass-exodus': '🚪 Mass Exodus Warning',
    'sudden-silence': '🔇 Sudden Communication Silence',
    'conflict-spike': '💥 Conflict Spike Detected'
  };
  return titles[type] || '⚠️ Crisis Alert';
}

function getSeverityStyle(severity) {
  const base = { ...styles.alert };
  
  if (severity === 'critical') {
    return { ...base, ...styles.critical };
  } else if (severity === 'high') {
    return { ...base, ...styles.high };
  } else {
    return { ...base, ...styles.moderate };
  }
}

const styles = {
  container: {
    marginBottom: '1.5rem',
    zIndex: 1000,
  },
  alert: {
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '0.75rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    animation: 'slideDown 0.3s ease-out',
  },
  critical: {
    background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
    border: '2px solid #7f1d1d',
    color: 'white',
  },
  high: {
    background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
    border: '2px solid #9a3412',
    color: 'white',
  },
  moderate: {
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    border: '2px solid #b45309',
    color: 'white',
  },
  content: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
  },
  icon: {
    fontSize: '2rem',
    flexShrink: 0,
  },
  details: {
    flex: 1,
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
  },
  description: {
    fontSize: '0.95rem',
    marginBottom: '0.5rem',
    opacity: 0.95,
  },
  meta: {
    fontSize: '0.85rem',
    opacity: 0.85,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    flexShrink: 0,
  },
  btnAcknowledge: {
    padding: '0.5rem 1rem',
    background: 'rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '4px',
    color: 'white',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '0.875rem',
  },
  btnResolve: {
    padding: '0.5rem 1rem',
    background: 'rgba(255, 255, 255, 0.9)',
    border: '1px solid rgba(255, 255, 255, 1)',
    borderRadius: '4px',
    color: '#1f2937',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '0.875rem',
  },
};
