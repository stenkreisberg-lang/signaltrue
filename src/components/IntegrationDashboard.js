import React, { useState, useEffect, useCallback } from 'react';
import {
  Link2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  AlertTriangle,
  ExternalLink,
  Settings,
  TrendingUp,
  Users,
  BarChart3,
  Mail,
  Video,
  FileText,
  Briefcase,
  LayoutGrid
} from 'lucide-react';

/**
 * Integration Dashboard Component
 * 
 * Displays connected integrations status, coverage,
 * and allows connecting new data sources.
 */

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// Integration definitions with icons and descriptions
const INTEGRATIONS = {
  jira: {
    name: 'Jira',
    icon: LayoutGrid,
    color: 'bg-blue-500',
    description: 'Track project and task management',
    signals: ['Execution stagnation', 'Rework spiral', 'WIP overload']
  },
  asana: {
    name: 'Asana',
    icon: LayoutGrid,
    color: 'bg-pink-500',
    description: 'Track project and task management',
    signals: ['Execution stagnation', 'Rework spiral', 'WIP overload']
  },
  gmail: {
    name: 'Gmail',
    icon: Mail,
    color: 'bg-red-500',
    description: 'Analyze email patterns and after-hours activity',
    signals: ['Boundary erosion', 'Response drift']
  },
  meet: {
    name: 'Google Meet',
    icon: Video,
    color: 'bg-green-500',
    description: 'Track meeting load and recovery time',
    signals: ['Meeting fatigue', 'Recovery collapse', 'Panic coordination']
  },
  notion: {
    name: 'Notion',
    icon: FileText,
    color: 'bg-gray-800',
    description: 'Monitor documentation and decision patterns',
    signals: ['Decision churn', 'Documentation decay']
  },
  hubspot: {
    name: 'HubSpot',
    icon: Briefcase,
    color: 'bg-orange-500',
    description: 'Track CRM activity and external pressure',
    signals: ['External pressure injection', 'Escalation cascade']
  },
  pipedrive: {
    name: 'Pipedrive',
    icon: Briefcase,
    color: 'bg-emerald-500',
    description: 'Track CRM activity and external pressure',
    signals: ['External pressure injection', 'Escalation cascade']
  }
};

export default function IntegrationDashboard({ orgId, onIntegrationChange }) {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState({});
  const [showConnectModal, setShowConnectModal] = useState(null);

  // Fetch integration status
  const fetchIntegrations = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      const res = await fetch(`${API_BASE}/api/integration-dashboard/tiles`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error('Failed to fetch integrations');
      
      const data = await res.json();
      setIntegrations(data.tiles || []);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  // Start OAuth flow
  const connectIntegration = (source) => {
    const token = localStorage.getItem('token');
    const callbackUrl = `${window.location.origin}/integrations/callback`;
    
    // Redirect to OAuth start endpoint
    window.location.href = `${API_BASE}/api/integrations-v2/${source}/start?callback=${encodeURIComponent(callbackUrl)}&token=${token}`;
  };

  // Trigger manual sync
  const triggerSync = async (source) => {
    setSyncing(prev => ({ ...prev, [source]: true }));
    
    try {
      const token = localStorage.getItem('token');
      
      await fetch(`${API_BASE}/api/integrations-v2/sync/${source}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Refresh after a delay
      setTimeout(() => {
        fetchIntegrations();
        setSyncing(prev => ({ ...prev, [source]: false }));
      }, 2000);
      
    } catch (err) {
      console.error('Sync error:', err);
      setSyncing(prev => ({ ...prev, [source]: false }));
    }
  };

  // Disconnect integration
  const disconnectIntegration = async (source) => {
    if (!window.confirm(`Disconnect ${INTEGRATIONS[source]?.name || source}? This will stop data sync.`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      await fetch(`${API_BASE}/api/integrations-v2/${source}/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      fetchIntegrations();
      onIntegrationChange?.();
      
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  };

  // Calculate overall data quality score
  const calculateDataQuality = () => {
    const connected = integrations.filter(i => i.connected);
    if (connected.length === 0) return 0;
    
    const avgCoverage = connected.reduce((sum, i) => sum + (i.coverage || 0), 0) / connected.length;
    const sourceScore = Math.min(100, connected.length * 15);
    
    return Math.round((avgCoverage + sourceScore) / 2);
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const connectedCount = integrations.filter(i => i.connected).length;
  const dataQuality = calculateDataQuality();

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{connectedCount}</p>
              <p className="text-sm text-gray-500">Connected</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{dataQuality}%</p>
              <p className="text-sm text-gray-500">Data Quality</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {integrations.reduce((sum, i) => sum + (i.signals_enabled || 0), 0)}
              </p>
              <p className="text-sm text-gray-500">Signals Enabled</p>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(INTEGRATIONS).map(([source, config]) => {
          const integration = integrations.find(i => i.source === source);
          const connected = integration?.connected || false;
          const Icon = config.icon;
          
          return (
            <div
              key={source}
              className={`bg-white rounded-lg border ${
                connected ? 'border-green-200' : 'border-gray-200'
              } overflow-hidden`}
            >
              {/* Header */}
              <div className={`px-4 py-3 ${config.color} bg-opacity-10 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${config.color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{config.name}</h3>
                    <p className="text-xs text-gray-500">{config.description}</p>
                  </div>
                </div>
                
                {connected ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-300" />
                )}
              </div>
              
              {/* Body */}
              <div className="p-4">
                {connected ? (
                  <>
                    {/* Status */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">Coverage</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${integration.coverage || 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-700">
                            {integration.coverage || 0}%
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500">Last Sync</p>
                        <p className="text-sm text-gray-700">
                          {integration.last_sync 
                            ? formatTimeAgo(integration.last_sync)
                            : 'Never'
                          }
                        </p>
                      </div>
                    </div>
                    
                    {/* Sync Status */}
                    {integration.sync_status === 'error' && (
                      <div className="mb-4 p-2 bg-red-50 rounded-lg flex items-center gap-2 text-xs text-red-700">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Sync error: {integration.sync_error}</span>
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => triggerSync(source)}
                        disabled={syncing[source]}
                        className="flex-1 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <RefreshCw className={`w-4 h-4 ${syncing[source] ? 'animate-spin' : ''}`} />
                        {syncing[source] ? 'Syncing...' : 'Sync Now'}
                      </button>
                      
                      <button
                        onClick={() => setShowConnectModal(source)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Signals that would be enabled */}
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">Enables these signals:</p>
                      <div className="flex flex-wrap gap-1">
                        {config.signals.map((signal, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                          >
                            {signal}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Connect Button */}
                    <button
                      onClick={() => connectIntegration(source)}
                      className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Link2 className="w-4 h-4" />
                      Connect {config.name}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Data Quality Tips */}
      {dataQuality < 70 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Improve Your Data Quality
          </h4>
          <ul className="space-y-2 text-sm text-amber-700">
            {connectedCount < 3 && (
              <li>• Connect more integrations to enable comprehensive signals</li>
            )}
            {integrations.some(i => i.connected && i.coverage < 70) && (
              <li>• Map more users in connected integrations to improve coverage</li>
            )}
            {!integrations.find(i => i.source === 'jira' || i.source === 'asana')?.connected && (
              <li>• Connect Jira or Asana to enable execution metrics</li>
            )}
            {!integrations.find(i => i.source === 'gmail')?.connected && (
              <li>• Connect Gmail to detect after-hours patterns</li>
            )}
          </ul>
        </div>
      )}

      {/* Settings Modal */}
      {showConnectModal && (
        <IntegrationSettingsModal
          source={showConnectModal}
          integration={integrations.find(i => i.source === showConnectModal)}
          onClose={() => setShowConnectModal(null)}
          onDisconnect={() => disconnectIntegration(showConnectModal)}
          onSave={() => {
            fetchIntegrations();
            setShowConnectModal(null);
          }}
        />
      )}
    </div>
  );
}

// Settings Modal Component
function IntegrationSettingsModal({ source, integration, onClose, onDisconnect, onSave }) {
  const config = INTEGRATIONS[source];
  const Icon = config?.icon || Link2;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className={`px-6 py-4 ${config?.color || 'bg-gray-500'} bg-opacity-10 flex items-center gap-3`}>
          <div className={`w-10 h-10 rounded-lg ${config?.color || 'bg-gray-500'} flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{config?.name || source} Settings</h3>
            <p className="text-sm text-gray-500">Manage integration connection</p>
          </div>
        </div>
        
        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Connection Status
            </label>
            <div className="flex items-center gap-2">
              {integration?.connected ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-green-700">Connected</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-500">Not connected</span>
                </>
              )}
            </div>
          </div>
          
          {integration?.connected && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User Coverage
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${integration.coverage || 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {integration.coverage || 0}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {integration.mapped_users || 0} of {integration.total_users || 0} users mapped
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Sync
                </label>
                <p className="text-sm text-gray-600">
                  {integration.last_sync 
                    ? new Date(integration.last_sync).toLocaleString()
                    : 'Never'
                  }
                </p>
              </div>
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex items-center justify-between rounded-b-lg">
          {integration?.connected ? (
            <button
              onClick={onDisconnect}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              Disconnect
            </button>
          ) : (
            <div />
          )}
          
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Utility function
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
