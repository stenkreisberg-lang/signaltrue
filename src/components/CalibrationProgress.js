import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
        const response = await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:8081'}/api/calibration/status/${orgId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

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
    featuresUnlocked,
    setup,
  } = calibrationData;

  if (setup && !setup.readiness.reportingReady) {
    const checks = [
      ['Company-wide permissions', setup.readiness.permissionsReady],
      ['Employee directory', setup.readiness.directoryReady],
      ['Timezone and working hours', setup.readiness.timezoneReady],
      ['Privacy-eligible teams', setup.readiness.teamsReady],
      ['Activity arriving', setup.readiness.activityReady],
      ['Activity mapped', setup.readiness.mappingReady],
    ];
    const destination = ['grant_admin_access', 'connect_sources'].includes(setup.readiness.nextStep)
      ? '/integrations'
      : ['sync_directory', 'confirm_timezone', 'assign_teams'].includes(setup.readiness.nextStep)
        ? '/app/employees'
        : '/app/signal-coverage';
    return (
      <Card>
        <h3 className="text-xl font-semibold text-slate-100 mb-2">Finish data setup</h3>
        <p className="text-slate-400 text-sm mb-5">
          The 30-day baseline starts only after company-wide access, team structure, and mapped
          activity are ready.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {checks.map(([label, complete]) => (
            <div
              key={label}
              className={`rounded-lg border px-3 py-2 text-sm ${
                complete
                  ? 'border-emerald-700 bg-emerald-900/20 text-emerald-300'
                  : 'border-amber-700 bg-amber-900/20 text-amber-200'
              }`}
            >
              {complete ? '✓' : '○'} {label}
            </div>
          ))}
        </div>
        <Link
          to={destination}
          className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white no-underline hover:text-white"
        >
          Continue setup
        </Link>
      </Card>
    );
  }

  // If calibration is complete, show unlock message
  if (!isInCalibration && featuresUnlocked) {
    return (
      <Card className="bg-gradient-to-r from-emerald-900/30 to-emerald-800/30 border-emerald-700">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <svg
              className="w-12 h-12 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-emerald-400 mb-2">
              Baseline Calibration Complete
            </h3>
            <p className="text-slate-300 mb-4">
              Signal Intelligence is now unlocked. You can now observe deviations, view risk
              signals, and receive decision guidance.
            </p>
            <div className="flex gap-2">
              <Badge variant="high">Signal Observation Active</Badge>
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
              calibrationConfidence === 'High'
                ? 'high'
                : calibrationConfidence === 'Medium'
                  ? 'medium'
                  : 'low'
            }
            size="large"
          >
            Confidence: {calibrationConfidence}
          </Badge>
        </div>

        <ProgressBar
          progress={calibrationProgress}
          label="Calibration Progress"
          variant={
            calibrationProgress >= 75 ? 'default' : calibrationProgress >= 40 ? 'warning' : 'danger'
          }
        />
      </div>

      <div className="mb-6">
        <h4 className="text-sm font-semibold text-slate-300 mb-3">Data Sources Connected</h4>
        <div className="grid grid-cols-2 gap-3">
          {dataSourcesConnected.map((source) => (
            <div
              key={source.source}
              className={`p-3 rounded-lg border ${
                source.status === 'measuring'
                  ? 'bg-emerald-900/20 border-emerald-700'
                  : source.status === 'needs_admin'
                    ? 'bg-amber-900/20 border-amber-700'
                    : 'bg-slate-700/50 border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-300">
                  {source.source.replaceAll('-', ' ')}
                </span>
                <span className="text-xs text-slate-400">{source.status.replace('_', ' ')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-sm font-semibold text-slate-300 mb-3">
          What You'll Get After Calibration
        </h4>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-slate-400">
            <svg
              className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span>Real-time signal observation for team health deviations</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-slate-400">
            <svg
              className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span>Benchmarking vs. your internal baseline</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-slate-400">
            <svg
              className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <span>Prescriptive decision options with trade-off analysis</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-slate-400">
            <svg
              className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Action tracking and outcome measurement</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-slate-400">
            <svg
              className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>Weekly leadership summary with top risk signals</span>
          </li>
        </ul>
      </div>

      {calibrationProgress < 100 && (
        <div className="mt-4 text-sm text-slate-400 text-center">
          During calibration, we're establishing your baseline patterns. No recommendations will be
          shown until calibration is complete.
        </div>
      )}
    </Card>
  );
};

export default CalibrationProgress;
