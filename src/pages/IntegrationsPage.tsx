import { adminTranslator } from '../utils/adminLanguage';
import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import IntegrationDashboard from '../components/IntegrationDashboard';
import { CheckCircle2, XCircle, ArrowLeft, Settings } from 'lucide-react';
import AppShell from '../components/app/AppShell';
import { getAuthenticatedContext } from '../utils/authContext';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8081';

interface CallbackStatus {
  success: boolean;
  source: string | null;
  message: string;
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
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  const locale = user?.reportLanguage || 'en';
  const t = adminTranslator(locale);

  // Exchange OAuth code for tokens
  const handleOAuthCallback = useCallback(
    async (source: string, code: string) => {
      setLoading(true);

      try {
        const token = localStorage.getItem('token');

        const res = await fetch(`${API_BASE}/api/integrations-v2/${source}/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Connection failed');
        }

        setCallbackStatus({
          success: true,
          source,
          message: 'Connected source',
        });

        // Clear URL params
        navigate('/integrations', { replace: true });
      } catch (err) {
        setCallbackStatus({
          success: false,
          source,
          message: err instanceof Error ? err.message : 'Connection failed',
        });
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const source = searchParams.get('source');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setCallbackStatus({
        success: false,
        source,
        message: errorParam,
      });
      return;
    }

    if (code && source) {
      handleOAuthCallback(source, code);
    }
  }, [handleOAuthCallback, searchParams]);

  useEffect(() => {
    getAuthenticatedContext()
      .then((context) => setUser(context.user))
      .catch(() => setUser(null));
  }, []);

  return (
    <AppShell locale={locale} user={user} section={t('Data Sources')} width="wide">
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                aria-label={t('Go back')}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-control transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div>
                <h1 className="text-lead font-bold text-slate-900">{t('Data sources')}</h1>
                <p className="text-caption text-slate-600">
                  {t('Connect metadata sources for privacy-protected organizational signals')}
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              aria-label={t('Return to dashboard')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-control transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Callback Status Banner */}
        {callbackStatus && (
          <div className={`px-6 py-4 ${callbackStatus.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                {callbackStatus.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className={callbackStatus.success ? 'text-green-700' : 'text-red-700'}>
                  {t(callbackStatus.message)}
                  {callbackStatus.success && callbackStatus.source
                    ? ': ' + formatSourceName(callbackStatus.source)
                    : ''}
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
            <div className="bg-white rounded-control p-8 flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-teal-100 border-t-teal-700 rounded-full animate-spin" />
              <p className="mt-4 text-gray-600">{t('Connecting integration...')}</p>
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
                onIntegrationChange={() => {}}
                userRole={user?.role}
                locale={locale}
              />
            </div>

            {/* Setup guidance */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <h2 className="text-body font-semibold text-slate-900 mb-4">
                  {t('Setup responsibilities')}
                </h2>
                <div className="p-5 bg-white border border-slate-200 rounded-container">
                  <h3 className="font-medium text-slate-900 mb-2">
                    {t('Establish qualified coverage')}
                  </h3>
                  <ol className="space-y-2 text-caption text-slate-600">
                    <li className="flex items-start gap-2">
                      <span className="font-bold">1.</span>
                      {t('IT approves the minimum required read-only sources')}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">2.</span>
                      {t('The organization administrator maps eligible people and teams')}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">3.</span>
                      {t('Health & Safety confirms the review purpose and consultation plan')}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">4.</span>
                      {t('SignalTrue reports only after coverage and baseline checks pass')}
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          <section className="mt-8 p-5 bg-teal-50 border border-teal-100 rounded-container">
            <h2 className="font-semibold text-slate-900">
              {user?.reportLanguage === 'et'
                ? 'Milliseid andmeid kasutatakse?'
                : 'What data is used?'}
            </h2>
            <p className="text-slate-600 mt-1">
              {user?.reportLanguage === 'et'
                ? 'SignalTrue kasutab kohtumiste ja sõnumite kellaaegu ning arvu. Tööalased nimed ja e-posti aadressid aitavad personalijuhil töötajaid tiimidega seostada. Aruanded kirjeldavad tiimide töömustreid. Sõnumite, e-kirjade ja dokumentide sisu jääb välja.'
                : 'SignalTrue uses calendar and messaging metadata such as timestamps and counts. HR uses directory names and work emails to map people to teams. Reports describe team work patterns. Message bodies, email content and document text are excluded.'}
            </p>
          </section>
        </main>
      </div>
    </AppShell>
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
    basecamp: 'Basecamp',
  };
  return names[source] || source;
}
