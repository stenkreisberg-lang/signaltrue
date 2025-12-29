import React, { useState, useEffect } from 'react';

/**
 * Privacy & Data Use Page
 * Product feature, NOT footer link
 * Shows: What we track, what we DON'T track, transparency log
 */
function Privacy() {
  const [activeTab, setActiveTab] = useState('overview'); // overview | transparency | policy
  const [transparencyLog, setTransparencyLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch transparency log if admin
  useEffect(() => {
    if (activeTab === 'transparency') {
      fetchTransparencyLog();
    }
  }, [activeTab]);

  const fetchTransparencyLog = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/privacy/transparency-log', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch transparency log`);
      }

      const data = await response.json();
      setTransparencyLog(data.logEntries || []);
    } catch (err) {
      console.error('[Privacy] Error fetching transparency log:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      padding: '40px',
      maxWidth: '900px',
      margin: '0 auto',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 700,
          color: '#1a1a1a',
          marginBottom: '12px'
        }}>
          Privacy & Data Use
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          lineHeight: '1.6'
        }}>
          We believe transparency is not a legal checkbox. It's how you earn trust.
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '24px',
        borderBottom: '2px solid #e5e7eb',
        marginBottom: '32px'
      }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '12px 0',
            fontSize: '15px',
            fontWeight: 600,
            color: activeTab === 'overview' ? '#2563eb' : '#6b7280',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '2px solid #2563eb' : '2px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('transparency')}
          style={{
            padding: '12px 0',
            fontSize: '15px',
            fontWeight: 600,
            color: activeTab === 'transparency' ? '#2563eb' : '#6b7280',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'transparency' ? '2px solid #2563eb' : '2px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Transparency Log
        </button>
        <button
          onClick={() => setActiveTab('policy')}
          style={{
            padding: '12px 0',
            fontSize: '15px',
            fontWeight: 600,
            color: activeTab === 'policy' ? '#2563eb' : '#6b7280',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'policy' ? '2px solid #2563eb' : '2px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Full Policy
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {/* What We Track */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#1a1a1a',
              marginBottom: '16px'
            }}>
              What We Track
            </h2>
            <div style={{
              background: '#f9fafb',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0
              }}>
                {[
                  'Aggregated activity patterns (team-level only)',
                  'Meeting frequency and duration (metadata only)',
                  'Message volume and response timing (counts only)',
                  'Work hour patterns (after-hours activity, focus time blocks)'
                ].map((item, idx) => (
                  <li key={idx} style={{
                    padding: '12px 0',
                    borderBottom: idx < 3 ? '1px solid #e5e7eb' : 'none',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}>
                    <span style={{
                      fontSize: '18px',
                      color: '#10b981',
                      marginTop: '2px'
                    }}>✓</span>
                    <span style={{
                      fontSize: '15px',
                      color: '#4b5563',
                      lineHeight: '1.6'
                    }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* What We NEVER Track */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#1a1a1a',
              marginBottom: '16px'
            }}>
              What We NEVER Track
            </h2>
            <div style={{
              background: '#fef2f2',
              borderRadius: '12px',
              padding: '24px',
              border: '2px solid #fecaca'
            }}>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0
              }}>
                {[
                  'Message content from Slack, email, or any communication tool',
                  'Email content or subject lines',
                  'File contents or document text',
                  'Individual performance scores or rankings',
                  'Browsing history or screen activity',
                  'Keystroke logging or surveillance of any kind'
                ].map((item, idx) => (
                  <li key={idx} style={{
                    padding: '12px 0',
                    borderBottom: idx < 5 ? '1px solid #fecaca' : 'none',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}>
                    <span style={{
                      fontSize: '18px',
                      color: '#ef4444',
                      marginTop: '2px',
                      fontWeight: 700
                    }}>✗</span>
                    <span style={{
                      fontSize: '15px',
                      color: '#7f1d1d',
                      lineHeight: '1.6',
                      fontWeight: 600
                    }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* How We Protect */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#1a1a1a',
              marginBottom: '16px'
            }}>
              How We Protect Your Data
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px'
            }}>
              {[
                {
                  title: 'Team-Level Only',
                  description: 'All data aggregated (min. 5 people per team)'
                },
                {
                  title: 'GDPR Compliant',
                  description: 'Full compliance with EU data protection laws'
                },
                {
                  title: 'OAuth Only',
                  description: 'Read-only permissions, no password storage'
                },
                {
                  title: 'Encrypted',
                  description: 'End-to-end encryption in transit and at rest'
                },
                {
                  title: 'No Third-Party Sales',
                  description: 'Your data is never sold to anyone, ever'
                },
                {
                  title: 'Instant Revocation',
                  description: 'Disconnect integrations anytime'
                }
              ].map((item, idx) => (
                <div key={idx} style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#1a1a1a',
                    marginBottom: '8px'
                  }}>
                    {item.title}
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    lineHeight: '1.5',
                    margin: 0
                  }}>
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <h2 style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#1a1a1a',
              marginBottom: '16px'
            }}>
              Your Rights
            </h2>
            <div style={{
              background: '#eff6ff',
              borderRadius: '12px',
              padding: '24px',
              border: '2px solid #bfdbfe'
            }}>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0
              }}>
                {[
                  'Request data deletion at any time',
                  'Export your organization\'s aggregated data',
                  'Revoke integration access instantly',
                  'View transparency log of all data pulls (admins)'
                ].map((item, idx) => (
                  <li key={idx} style={{
                    padding: '12px 0',
                    borderBottom: idx < 3 ? '1px solid #bfdbfe' : 'none',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}>
                    <span style={{
                      fontSize: '18px',
                      color: '#2563eb',
                      marginTop: '2px'
                    }}>→</span>
                    <span style={{
                      fontSize: '15px',
                      color: '#1e40af',
                      lineHeight: '1.6'
                    }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      )}

      {/* Transparency Log Tab */}
      {activeTab === 'transparency' && (
        <div>
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fbbf24',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <p style={{
              fontSize: '14px',
              color: '#78350f',
              margin: 0,
              lineHeight: '1.6'
            }}>
              <strong>Admin View:</strong> This log shows every data pull SignalTrue makes from your connected integrations. 
              All data is aggregated to team level only.
            </p>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #e5e7eb',
                borderTop: '4px solid #2563eb',
                borderRadius: '50%',
                margin: '0 auto',
                animation: 'spin 1s linear infinite'
              }} />
            </div>
          )}

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '16px',
              color: '#991b1b'
            }}>
              Error loading transparency log: {error}
            </div>
          )}

          {!loading && !error && transparencyLog.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#6b7280'
            }}>
              No data pulls logged yet.
            </div>
          )}

          {!loading && !error && transparencyLog.length > 0 && (
            <div style={{
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead style={{
                  background: '#f9fafb',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  <tr>
                    <th style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>Timestamp</th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>Source</th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>Action</th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>Aggregation Level</th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>Records</th>
                  </tr>
                </thead>
                <tbody>
                  {transparencyLog.map((entry, idx) => (
                    <tr key={idx} style={{
                      borderBottom: idx < transparencyLog.length - 1 ? '1px solid #e5e7eb' : 'none'
                    }}>
                      <td style={{
                        padding: '16px',
                        fontSize: '14px',
                        color: '#4b5563'
                      }}>
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td style={{
                        padding: '16px',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#1a1a1a'
                      }}>
                        {entry.source}
                      </td>
                      <td style={{
                        padding: '16px',
                        fontSize: '14px',
                        color: '#4b5563'
                      }}>
                        {entry.action}
                      </td>
                      <td style={{
                        padding: '16px',
                        fontSize: '14px',
                        color: '#059669',
                        fontWeight: 500
                      }}>
                        {entry.aggregationLevel}
                      </td>
                      <td style={{
                        padding: '16px',
                        fontSize: '14px',
                        color: '#6b7280',
                        textAlign: 'center'
                      }}>
                        {entry.recordsProcessed.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Policy Tab */}
      {activeTab === 'policy' && (
        <div>
          <div style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '32px'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#1a1a1a',
              marginBottom: '24px'
            }}>
              SignalTrue Privacy & Data Use Policy
            </h2>

            {[
              {
                title: 'What We Track',
                content: 'We analyze aggregated team activity patterns including meeting frequency, message volume, response timing, and work hour patterns. All data is team-level only (minimum 5 people).'
              },
              {
                title: 'What We Never Track',
                content: 'We never access message content, email content, file contents, or any individual surveillance data. No keystroke logging, screen monitoring, or individual performance scoring.'
              },
              {
                title: 'Data Security',
                content: 'All data is encrypted in transit and at rest. We use OAuth-only access with read-only permissions. GDPR compliant. No data sold to third parties.'
              },
              {
                title: 'Aggregation Thresholds',
                content: 'All metrics require minimum 5 people per team. Individual-level data is never stored or displayed. Patterns shown are team averages only.'
              },
              {
                title: 'Data Retention',
                content: 'Free tier: 7 days. Detection tier: 30 days. Impact Proof tier: 90 days. Data auto-deleted after retention period.'
              },
              {
                title: 'Your Rights',
                content: 'Request data deletion, export aggregated data, revoke integration access, view transparency log (admins).'
              }
            ].map((section, idx) => (
              <div key={idx} style={{
                marginBottom: idx < 5 ? '32px' : 0
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#1a1a1a',
                  marginBottom: '12px'
                }}>
                  {section.title}
                </h3>
                <p style={{
                  fontSize: '15px',
                  color: '#4b5563',
                  lineHeight: '1.7',
                  margin: 0
                }}>
                  {section.content}
                </p>
              </div>
            ))}

            <div style={{
              marginTop: '32px',
              paddingTop: '24px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <p style={{
                fontSize: '13px',
                color: '#9ca3af',
                margin: 0
              }}>
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading spinner keyframe (inline) */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Privacy;
