import React, { useEffect, useState } from 'react';
import { Card, ProgressBar, Badge } from './UIComponents';

/**
 * CalibrationProgress component
 * Shows calibration status and progress for organizations in baseline calibration period
 */
const CalibrationProgress = ({ orgId }) => {
  const [calibrationData, setCalibrationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchCalibrationStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8080'}/api/calibration/status/${orgId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch calibration status');
        }
        
        const data = await response.json();
        setCalibrationData(data);
      } catch (err) {
        console.error('Error fetching calibration status:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (orgId) {
      fetchCalibrationStatus();
      // Poll every 30 seconds during calibration
      const interval = setInterval(fetchCalibrationStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [orgId]);
  
  if (loading) {
    return (
      <Card>
        <div className="text-center py-8 text-slate-400">Loading calibration status...</div>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <div className="text-center py-8 text-red-400">Error: {error}</div>
      </Card>
    );
  }
  
  if (!calibrationData) {
    return null;
  }
  
  const { 
    isInCalibration, 
    calibrationDay, 
    calibrationProgress, 
    calibrationConfidence,
    dataSourcesConnected,
    daysRemaining,
    featuresUnlocked
  } = calibrationData;
  
  // If calibration is complete, show unlock message
  if (!isInCalibration && featuresUnlocked) {
    return (
      <Card className="bg-gradient-to-r from-emerald-900/30 to-emerald-800/30 border-emerald-700">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <svg className="w-12 h-12 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-emerald-400 mb-2">
              Baseline Calibration Complete
            </h3>
            <p className="text-slate-300 mb-4">
              Signal Intelligence is now unlocked. You can now detect deviations, view risk signals, and receive decision guidance.
            </p>
            <div className="flex gap-2">
              <Badge variant="high">Signal Detection Active</Badge>
              <Badge variant="high">Benchmarking Enabled</Badge>
              <Badge variant="high">Action Tracking Ready</Badge>
            </div>
          </div>
        </div>
      </Card>
    );
  }
  
  // Show calibration progress
  return (
    <Card>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-100 mb-1">
              Baseline Calibration Period
            </h3>
            <p className="text-slate-400 text-sm">
              Calibration day {calibrationDay} of 30 • {daysRemaining} days remaining
            </p>
          </div>
          <Badge 
            variant={
              calibrationConfidence === 'High' ? 'high' : 
              calibrationConfidence === 'Medium' ? 'medium' : 
              'low'
            }
            size="large"
          >
            Confidence: {calibrationConfidence}
          </Badge>
        </div>
        
        <ProgressBar 
          progress={calibrationProgress} 
          label="Calibration Progress"
          variant={calibrationProgress >= 75 ? 'default' : calibrationProgress >= 40 ? 'warning' : 'danger'}
        />
      </div>
      
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-slate-300 mb-3">Data Sources Connected</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-lg border ${
            dataSourcesConnected.some(s => s.source === 'slack') 
              ? 'bg-emerald-900/20 border-emerald-700' 
              : 'bg-slate-700/50 border-slate-600'
          }`}>
            <div className="flex items-center gap-2">
              {dataSourcesConnected.some(s => s.source === 'slack') ? (
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              <span className="text-sm font-medium text-slate-300">Slack</span>
            </div>
          </div>
          
          <div className={`p-3 rounded-lg border ${
            dataSourcesConnected.some(s => s.source === 'google-calendar') 
              ? 'bg-emerald-900/20 border-emerald-700' 
              : 'bg-slate-700/50 border-slate-600'
          }`}>
            <div className="flex items-center gap-2">
              {dataSourcesConnected.some(s => s.source === 'google-calendar') ? (
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              <span className="text-sm font-medium text-slate-300">Google Calendar</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-sm font-semibold text-slate-300 mb-3">
          What You'll Get After Calibration
        </h4>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-slate-400">
            <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Real-time signal detection for team health deviations</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-slate-400">
            <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Benchmarking vs. your internal baseline</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-slate-400">
            <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Prescriptive decision options with trade-off analysis</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-slate-400">
            <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Action tracking and outcome measurement</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-slate-400">
            <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Weekly leadership summary with top risk signals</span>
          </li>
        </ul>
      </div>
      
      {calibrationProgress < 100 && (
        <div className="mt-4 text-sm text-slate-400 text-center">
          During calibration, we're establishing your baseline patterns. 
          No recommendations will be shown until calibration is complete.
        </div>
      )}
    </Card>
  );
};

export default CalibrationProgress;
