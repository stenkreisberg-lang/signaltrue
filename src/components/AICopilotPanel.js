import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  Users,
  Info,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Copy,
  ExternalLink,
  Brain,
  Shield
} from 'lucide-react';

/**
 * AI Copilot Panel Component
 * 
 * Displays AI-generated insights, actions, and message templates
 * for signals on Org, Team, and Individual views.
 */

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// Severity badge colors
const severityColors = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200'
};

// Action effort badges
const effortColors = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700'
};

export default function AICopilotPanel({ 
  orgId, 
  teamId = null, 
  userId = null,
  viewerRole = 'TEAM_LEAD',
  signals = [],
  connectors = {},
  onActionTaken,
  className = ''
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    actions: true,
    templates: false,
    explainability: false
  });
  const [feedbackGiven, setFeedbackGiven] = useState({});
  const [copiedTemplate, setCopiedTemplate] = useState(null);

  // Fetch copilot response
  const fetchCopilotResponse = useCallback(async () => {
    if (!signals || signals.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      const res = await fetch(`${API_BASE}/api/ai/copilot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          teamId,
          timeRange: 'last_7d',
          viewerRole,
          signals,
          connectors,
          policies: {
            core_hours_local: { start: '08:00', end: '18:00' },
            language: 'en',
            privacy_mode: 'metadata_only'
          }
        })
      });
      
      if (!res.ok) {
        throw new Error('Failed to get AI insights');
      }
      
      const data = await res.json();
      setResponse(data);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [teamId, viewerRole, signals, connectors]);

  useEffect(() => {
    if (signals && signals.length > 0) {
      fetchCopilotResponse();
    }
  }, [signals, fetchCopilotResponse]);

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle feedback
  const handleFeedback = async (signalType, helpful) => {
    try {
      const token = localStorage.getItem('token');
      
      await fetch(`${API_BASE}/api/ai/copilot/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          signal_type: signalType,
          helpful
        })
      });
      
      setFeedbackGiven(prev => ({
        ...prev,
        [signalType]: helpful ? 'up' : 'down'
      }));
      
    } catch (err) {
      console.error('Feedback error:', err);
    }
  };

  // Copy template to clipboard
  const copyTemplate = (type, text) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplate(type);
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  // Get severity label
  const getSeverityLevel = (severity) => {
    if (severity >= 70) return 'high';
    if (severity >= 40) return 'medium';
    return 'low';
  };

  if (!signals || signals.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <Sparkles className="w-5 h-5" />
          <span>No signals to analyze. Check back when patterns emerge.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Copilot</h3>
            <p className="text-xs text-gray-500">Powered by research-backed analysis</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCopilotResponse}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => toggleSection('explainability')}
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="How this works"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-100">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !response && (
        <div className="p-8 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="mt-4 text-gray-500 text-sm">Analyzing patterns...</p>
        </div>
      )}

      {/* Content */}
      {response && (
        <div className="divide-y divide-gray-100">
          {/* Summary Section */}
          <CollapsibleSection
            title="What's Happening"
            expanded={expandedSections.summary}
            onToggle={() => toggleSection('summary')}
            icon={<Sparkles className="w-4 h-4 text-indigo-500" />}
          >
            <p className="text-gray-700 mb-4">{response.summary}</p>
            
            {/* Evidence Bullets */}
            {response.evidence && response.evidence.length > 0 && (
              <div className="space-y-2 mb-4">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">What Changed</h4>
                <ul className="space-y-1">
                  {response.evidence.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-indigo-400 mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Likely Causes */}
            {response.likely_causes && response.likely_causes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Likely Drivers</h4>
                <ul className="space-y-1">
                  {response.likely_causes.map((cause, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-amber-400 mt-1">→</span>
                      <span>{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Confidence Note */}
            {response.confidence_notes && response.confidence_notes.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-xs text-amber-700">
                  <strong>Note:</strong> {response.confidence_notes[0]}
                </p>
              </div>
            )}
          </CollapsibleSection>

          {/* Actions Section */}
          <CollapsibleSection
            title="Recommended Actions"
            expanded={expandedSections.actions}
            onToggle={() => toggleSection('actions')}
            icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
            badge={response.recommended_actions?.length || 0}
          >
            <div className="space-y-3">
              {(response.recommended_actions || []).map((action, i) => (
                <ActionCard
                  key={i}
                  action={action}
                  onTaken={() => onActionTaken?.(action)}
                />
              ))}
            </div>
            
            {/* Playbooks */}
            {response.playbooks && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {response.playbooks.team_lead_7d && response.playbooks.team_lead_7d.length > 0 && (
                  <PlaybookCard
                    title="Team Lead 7-Day"
                    items={response.playbooks.team_lead_7d}
                  />
                )}
                {response.playbooks.hr_7d && response.playbooks.hr_7d.length > 0 && (
                  <PlaybookCard
                    title="HR 7-Day"
                    items={response.playbooks.hr_7d}
                  />
                )}
              </div>
            )}
          </CollapsibleSection>

          {/* Templates Section */}
          <CollapsibleSection
            title="Message Templates"
            expanded={expandedSections.templates}
            onToggle={() => toggleSection('templates')}
            icon={<Users className="w-4 h-4 text-blue-500" />}
          >
            <div className="space-y-4">
              {response.message_templates?.manager_to_team && (
                <TemplateCard
                  title="Manager to Team"
                  template={response.message_templates.manager_to_team}
                  onCopy={(text) => copyTemplate('manager', text)}
                  copied={copiedTemplate === 'manager'}
                />
              )}
              
              {response.message_templates?.hr_to_leader && (
                <TemplateCard
                  title="HR to Leader"
                  template={response.message_templates.hr_to_leader}
                  onCopy={(text) => copyTemplate('hr', text)}
                  copied={copiedTemplate === 'hr'}
                />
              )}
              
              {response.message_templates?.exec_summary && (
                <TemplateCard
                  title="Executive Summary"
                  template={response.message_templates.exec_summary}
                  onCopy={(text) => copyTemplate('exec', text)}
                  copied={copiedTemplate === 'exec'}
                />
              )}
            </div>
          </CollapsibleSection>

          {/* Explainability Section */}
          <CollapsibleSection
            title="How This Works"
            expanded={expandedSections.explainability}
            onToggle={() => toggleSection('explainability')}
            icon={<Shield className="w-4 h-4 text-gray-500" />}
          >
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-3 h-3 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Privacy First</h4>
                  <p>We only analyze metadata—timestamps, counts, and patterns. We never read email content, document text, or chat messages.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-3 h-3 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Research-Backed</h4>
                  <p>Our signals are grounded in the Job Demands-Resources (JD-R) model, after-hours email research, and meeting fatigue studies.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Actions from Playbook</h4>
                  <p>Recommended actions come from a deterministic playbook, not AI generation. The AI only helps explain patterns in plain language.</p>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Feedback */}
          <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">Was this helpful?</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleFeedback('general', true)}
                className={`p-2 rounded-lg transition-colors ${
                  feedbackGiven.general === 'up' 
                    ? 'bg-green-100 text-green-600' 
                    : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleFeedback('general', false)}
                className={`p-2 rounded-lg transition-colors ${
                  feedbackGiven.general === 'down' 
                    ? 'bg-red-100 text-red-600' 
                    : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Collapsible Section Component
function CollapsibleSection({ title, expanded, onToggle, icon, badge, children }) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-gray-900">{title}</span>
          {badge !== undefined && badge > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      
      {expanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

// Action Card Component
function ActionCard({ action, onTaken }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-medium text-gray-900 text-sm">{action.action}</p>
          {action.why && (
            <p className="text-xs text-gray-500 mt-1">{action.why}</p>
          )}
        </div>
        
        {onTaken && (
          <button
            onClick={onTaken}
            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            title="Mark as done"
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <div className="flex items-center gap-3 mt-2">
        {action.owner && (
          <span className="text-xs text-gray-500">
            <Users className="w-3 h-3 inline mr-1" />
            {action.owner}
          </span>
        )}
        
        {action.effort && (
          <span className={`text-xs px-2 py-0.5 rounded ${effortColors[action.effort] || effortColors.medium}`}>
            {action.effort} effort
          </span>
        )}
        
        {action.time_to_effect && (
          <span className="text-xs text-gray-500">
            <Clock className="w-3 h-3 inline mr-1" />
            {action.time_to_effect}
          </span>
        )}
      </div>
    </div>
  );
}

// Playbook Card Component
function PlaybookCard({ title, items }) {
  return (
    <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
      <h5 className="text-xs font-medium text-indigo-700 mb-2">{title}</h5>
      <ul className="space-y-1">
        {items.slice(0, 5).map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-indigo-900">
            <span className="text-indigo-400 font-bold">{i + 1}.</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Template Card Component
function TemplateCard({ title, template, onCopy, copied }) {
  return (
    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-xs font-medium text-blue-700">{title}</h5>
        <button
          onClick={() => onCopy(template.body)}
          className={`p-1.5 rounded transition-colors ${
            copied 
              ? 'bg-green-100 text-green-600' 
              : 'hover:bg-blue-100 text-blue-500'
          }`}
        >
          {copied ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>
      </div>
      
      {template.subject && (
        <p className="text-xs text-blue-800 font-medium mb-1">
          Subject: {template.subject}
        </p>
      )}
      
      <p className="text-xs text-blue-900 whitespace-pre-wrap">
        {template.body?.substring(0, 200)}...
      </p>
    </div>
  );
}
