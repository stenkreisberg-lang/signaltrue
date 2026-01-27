import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import IntegrationDashboard from '../components/IntegrationDashboard';
import AICopilotPanel from '../components/AICopilotPanel';
import {
  Link2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Settings
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

interface CallbackStatus {
  success: boolean;
  source: string | null;
  message: string;
}

interface Signal {
  _id: string;
  signal_type: string;
  severity: number;
  confidence: number;
}

/**
 * Integrations Page
 * 
 * Main page for managing Category-King integrations.
 * Handles OAuth callbacks and displays integration dashboard.
 */
export default function IntegrationsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [callbackStatus, setCallbackStatus] = useState<CallbackStatus | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(false);
  const [, setError] = useState<string | null>(null);

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const source = searchParams.get('source');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setCallbackStatus({
        success: false,
        source,
        message: errorParam
      });
      return;
    }

    if (code && source) {
      handleOAuthCallback(source, code);
    }
  }, [searchParams]);

  // Exchange OAuth code for tokens
  const handleOAuthCallback = async (source: string, code: string) => {
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      const res = await fetch(`${API_BASE}/api/integrations-v2/${source}/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Connection failed');
      }
      
      setCallbackStatus({
        success: true,
        source,
        message: `${formatSourceName(source)} connected successfully!`
      });
      
      // Clear URL params
      navigate('/integrations', { replace: true });
      
      // Fetch updated signals
      fetchSignals();
      
    } catch (err) {
      setCallbackStatus({
        success: false,
        source,
        message: err instanceof Error ? err.message : 'Connection failed'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch active signals
  const fetchSignals = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const res = await fetch(`${API_BASE}/api/signals?source=category-king`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setSignals(data.signals || []);
      }
    } catch (err) {
      console.error('Error fetching signals:', err);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div>
              <h1 className="text-xl font-bold text-gray-900">Integrations</h1>
              <p className="text-sm text-gray-500">
                Connect your tools to enable Category-King signals
              </p>
            </div>
          </div>
          
          <button
            onClick={() => navigate('/settings')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Callback Status Banner */}
      {callbackStatus && (
        <div className={`px-6 py-4 ${
          callbackStatus.success ? 'bg-green-50' : 'bg-red-50'
        }`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {callbackStatus.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span className={callbackStatus.success ? 'text-green-700' : 'text-red-700'}>
                {callbackStatus.message}
              </span>
            </div>
            
            <button
              onClick={() => setCallbackStatus(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="mt-4 text-gray-600">Connecting integration...</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Integration Dashboard */}
          <div className="lg:col-span-2">
            <IntegrationDashboard 
              orgId={null}
              onIntegrationChange={fetchSignals}
            />
          </div>
          
          {/* AI Copilot Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                AI Insights
              </h2>
              
              <AICopilotPanel
                orgId={null}
                signals={signals as any}
                viewerRole="TEAM_LEAD"
                onActionTaken={() => {}}
              />
              
              {/* Getting Started Tips */}
              {signals.length === 0 && (
                <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <h3 className="font-medium text-indigo-900 mb-2">
                    Getting Started
                  </h3>
                  <ol className="space-y-2 text-sm text-indigo-700">
                    <li className="flex items-start gap-2">
                      <span className="font-bold">1.</span>
                      Connect at least 2-3 integrations for comprehensive signals
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">2.</span>
                      Map team members to integration users
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">3.</span>
                      Allow 24-48 hours for baseline calculation
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">4.</span>
                      Signals will appear once patterns are detected
                    </li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="mt-12 p-6 bg-gray-100 rounded-lg">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <Link2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Privacy First</h3>
              <p className="text-gray-600 mt-1">
                SignalTrue only accesses <strong>metadata</strong>—timestamps, counts, and patterns. 
                We never read email content, document text, chat messages, or any personally 
                identifiable information. All data is encrypted in transit and at rest.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-600">
                  ✓ No email content
                </span>
                <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-600">
                  ✓ No document text
                </span>
                <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-600">
                  ✓ No chat messages
                </span>
                <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-600">
                  ✓ Encrypted tokens
                </span>
                <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-600">
                  ✓ GDPR compliant
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Utility
function formatSourceName(source: string): string {
  const names: Record<string, string> = {
    jira: 'Jira',
    asana: 'Asana',
    gmail: 'Gmail',
    meet: 'Google Meet',
    notion: 'Notion',
    hubspot: 'HubSpot',
    pipedrive: 'Pipedrive',
    basecamp: 'Basecamp'
  };
  return names[source] || source;
}
