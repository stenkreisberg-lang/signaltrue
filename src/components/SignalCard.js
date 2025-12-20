import React from 'react';
import { Card, Badge, Button } from './UIComponents';

/**
 * SignalCard component
 * Primary UI for displaying signals with severity, confidence, and deviation data
 */
const SignalCard = ({ signal, onViewDetails, onAssign, onUpdateStatus }) => {
  const {
    _id,
    title,
    severity,
    confidence,
    status,
    deviation,
    timeToImpact,
    consequence,
    owner,
    teamId,
    dueDate
  } = signal;
  
  // Determine severity icon
  const getSeverityIcon = (sev) => {
    switch (sev) {
      case 'Critical':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'Risk':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };
  
  // Format status for display
  const formatStatus = (st) => {
    return st.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
  };
  
  // Calculate days until due date
  const getDaysUntilDue = () => {
    if (!dueDate) return null;
    const days = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `Due in ${days} days`;
  };
  
  const daysUntilDue = getDaysUntilDue();
  const isOverdue = dueDate && new Date(dueDate) < new Date();
  
  return (
    <Card className="hover:border-emerald-700 transition-colors cursor-pointer" onClick={onViewDetails}>
      <div className="flex items-start gap-4">
        {/* Severity indicator */}
        <div className={`flex-shrink-0 p-3 rounded-lg ${
          severity === 'Critical' ? 'bg-red-900/30 text-red-400' :
          severity === 'Risk' ? 'bg-orange-900/30 text-orange-400' :
          'bg-blue-900/30 text-blue-400'
        }`}>
          {getSeverityIcon(severity)}
        </div>
        
        {/* Signal content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-100 mb-2">
                {title}
              </h3>
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge 
                  variant={severity.toLowerCase()} 
                  icon={getSeverityIcon(severity)}
                >
                  {severity}
                </Badge>
                <Badge 
                  variant={confidence.toLowerCase()}
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                >
                  {confidence} Confidence
                </Badge>
                <Badge variant={formatStatus(status)}>
                  {status}
                </Badge>
              </div>
            </div>
            
            {teamId?.name && (
              <div className="text-sm text-slate-400">
                {teamId.name}
              </div>
            )}
          </div>
          
          {/* Deviation info */}
          {deviation && (
            <div className="mb-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-slate-500 mb-1">Current</div>
                  <div className="text-slate-200 font-semibold">
                    {deviation.currentValue?.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Baseline</div>
                  <div className="text-slate-300">
                    {deviation.baselineValue?.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Deviation</div>
                  <div className={`font-semibold ${
                    deviation.deltaPercent > 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                    {deviation.deltaPercent > 0 ? '+' : ''}
                    {deviation.deltaPercent?.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Consequence */}
          {consequence?.statement && (
            <div className="mb-3 text-sm text-slate-400 italic">
              "{consequence.statement}"
            </div>
          )}
          
          {/* Time to impact */}
          {timeToImpact?.estimate && (
            <div className="mb-3 text-sm">
              <span className="text-slate-500">Impact timeframe: </span>
              <span className="text-orange-400 font-medium">{timeToImpact.estimate}</span>
            </div>
          )}
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-700">
            <div className="flex items-center gap-3 text-sm text-slate-400">
              {owner ? (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>{owner.name || owner.email}</span>
                </div>
              ) : (
                <button 
                  onClick={(e) => { e.stopPropagation(); onAssign?.(_id); }}
                  className="text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Assign owner
                </button>
              )}
              
              {daysUntilDue && (
                <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : ''}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{daysUntilDue}</span>
                </div>
              )}
            </div>
            
            <Button 
              variant="secondary" 
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails?.(_id);
              }}
            >
              View Details →
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SignalCard;
