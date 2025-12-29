import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SignalCard from '../../components/SignalCard';
import { Card, Badge, Button, EmptyState, Spinner, Modal } from '../../components/UIComponents';

/**
 * Signals Page - List and manage all signals
 */
const Signals = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inCalibration, setInCalibration] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  
  const orgId = localStorage.getItem('orgId');
  const severityFilter = searchParams.get('severity');
  const statusFilter = searchParams.get('status');
  
  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';
        
        let url = `${apiUrl}/api/signals/org/${orgId}`;
        const params = new URLSearchParams();
        if (severityFilter) params.append('severity', severityFilter);
        if (statusFilter) params.append('status', statusFilter);
        if (params.toString()) url += `?${params.toString()}`;
        
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch signals');
        
        const data = await response.json();
        
        if (data.inCalibration) {
          setInCalibration(true);
        } else {
          setSignals(data.signals || []);
        }
      } catch (err) {
        console.error('Error fetching signals:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (orgId) {
      fetchSignals();
    }
  }, [orgId, severityFilter, statusFilter]);
  
  const handleViewDetails = async (signalId) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      
      const response = await fetch(`${apiUrl}/api/signals/${signalId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch signal details');
      
      const data = await response.json();
      setSelectedSignal(data.signal);
      setShowDetail(true);
    } catch (err) {
      console.error('Error fetching signal details:', err);
    }
  };
  
  const filterCounts = {
    all: signals.length,
    critical: signals.filter(s => s.severity === 'Critical').length,
    risk: signals.filter(s => s.severity === 'Risk').length,
    open: signals.filter(s => s.status === 'Open' || s.status === 'Acknowledged').length,
    ignored: signals.filter(s => s.status === 'Ignored').length
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Spinner size="large" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-slate-100">SignalTrue</div>
            <Badge variant="default">Signals</Badge>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/app/overview" className="text-slate-300 hover:text-white transition-colors">
              Overview
            </Link>
            <Link to="/app/signals" className="text-white font-semibold">
              Signals
            </Link>
            <Link to="/app/benchmarks" className="text-slate-300 hover:text-white transition-colors">
              Benchmarks
            </Link>
            <Link to="/app/actions" className="text-slate-300 hover:text-white transition-colors">
              Actions
            </Link>
            <Link to="/app/privacy" className="text-slate-300 hover:text-white transition-colors">
              Privacy
            </Link>
            <Link to="/app/settings" className="text-slate-300 hover:text-white transition-colors">
              Settings
            </Link>
          </nav>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Risk Signals</h1>
          <p className="text-slate-400">
            Deviation intelligence with decision guidance
          </p>
        </div>
        
        {/* Calibration Gate */}
        {inCalibration ? (
          <Card>
            <EmptyState
              icon={
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              title="Signals Available After Calibration"
              description="Your baseline is being established. Signal Intelligence will unlock when calibration completes (30 days)."
              action={
                <Link to="/app/overview">
                  <Button variant="primary">View Calibration Progress</Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <>
            {/* Filters */}
            <div className="mb-6 flex items-center gap-3">
              <Button 
                variant={!severityFilter && !statusFilter ? 'primary' : 'ghost'} 
                size="small"
                onClick={() => setSearchParams({})}
              >
                All ({filterCounts.all})
              </Button>
              <Button 
                variant={severityFilter === 'Critical' ? 'primary' : 'ghost'} 
                size="small"
                onClick={() => setSearchParams({ severity: 'Critical' })}
              >
                Critical ({filterCounts.critical})
              </Button>
              <Button 
                variant={severityFilter === 'Risk' ? 'primary' : 'ghost'} 
                size="small"
                onClick={() => setSearchParams({ severity: 'Risk' })}
              >
                Risk ({filterCounts.risk})
              </Button>
              <Button 
                variant={statusFilter === 'Open' || statusFilter === 'Acknowledged' ? 'primary' : 'ghost'} 
                size="small"
                onClick={() => setSearchParams({ status: 'Open' })}
              >
                Open ({filterCounts.open})
              </Button>
              <Button 
                variant={statusFilter === 'Ignored' ? 'primary' : 'ghost'} 
                size="small"
                onClick={() => setSearchParams({ status: 'Ignored' })}
              >
                Ignored ({filterCounts.ignored})
              </Button>
            </div>
            
            {/* Signal List */}
            {signals.length > 0 ? (
              <div className="space-y-4">
                {signals.map(signal => (
                  <SignalCard
                    key={signal._id}
                    signal={signal}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <EmptyState
                  icon={
                    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  title="No Signals Found"
                  description={
                    severityFilter || statusFilter
                      ? 'No signals match your current filter. Try adjusting the filters above.'
                      : 'All team health metrics are within normal range vs baseline.'
                  }
                  action={
                    (severityFilter || statusFilter) && (
                      <Button variant="secondary" onClick={() => setSearchParams({})}>
                        Clear Filters
                      </Button>
                    )
                  }
                />
              </Card>
            )}
          </>
        )}
      </main>
      
      {/* Signal Detail Modal */}
      {selectedSignal && (
        <Modal
          isOpen={showDetail}
          onClose={() => setShowDetail(false)}
          title={selectedSignal.title}
          size="large"
        >
          <div className="space-y-6">
            {/* Badges */}
            <div className="flex gap-2">
              <Badge variant={selectedSignal.severity?.toLowerCase()}>
                {selectedSignal.severity}
              </Badge>
              <Badge variant={selectedSignal.confidence?.toLowerCase()}>
                {selectedSignal.confidence} Confidence
              </Badge>
              <Badge variant={selectedSignal.status?.toLowerCase().replace(' ', '-')}>
                {selectedSignal.status}
              </Badge>
            </div>
            
            {/* Deviation Chart Placeholder */}
            <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
              <div className="text-sm text-slate-400 mb-2">Deviation vs Baseline</div>
              <div className="text-center text-slate-500 py-12">
                Chart visualization coming soon
              </div>
            </div>
            
            {/* Drivers */}
            {selectedSignal.drivers && selectedSignal.drivers.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-3">What Changed (Drivers)</h3>
                <div className="space-y-2">
                  {selectedSignal.drivers.map((driver, idx) => (
                    <div key={idx} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-slate-200">{driver.name}</div>
                          <div className="text-sm text-slate-400">{driver.change}</div>
                        </div>
                        {driver.contribution && (
                          <div className="text-sm font-semibold text-emerald-400">
                            {driver.contribution}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Consequence */}
            {selectedSignal.consequence?.statement && (
              <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-3">What Usually Happens Next</h3>
                <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-4">
                  <p className="text-slate-300 italic">"{selectedSignal.consequence.statement}"</p>
                </div>
              </div>
            )}
            
            {/* Recommended Actions */}
            {selectedSignal.recommendedActions && selectedSignal.recommendedActions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-3">Recommended Trade-Off Decisions</h3>
                <div className="space-y-3">
                  {selectedSignal.recommendedActions.map((action, idx) => (
                    <div key={idx} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-slate-200">{action.action}</div>
                        {action.effort && (
                          <Badge variant="default" size="small">
                            {action.effort} Effort
                          </Badge>
                        )}
                      </div>
                      {action.expectedEffect && (
                        <div className="text-sm text-slate-400 mb-2">
                          Expected: {action.expectedEffect}
                        </div>
                      )}
                      {action.isInactionOption && action.inactionCost && (
                        <div className="text-sm text-orange-400">
                          Inaction cost: {action.inactionCost}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Signals;
