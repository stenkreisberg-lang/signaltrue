import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  Clock, 
  TrendingUp, 
  FileText, 
  AlertTriangle,
  ArrowRight,
  X
} from 'lucide-react';
import { Button } from './ui/button';

interface TrialStatus {
  isActive: boolean;
  isPaid: boolean;
  currentDay: number;
  daysRemaining: number;
  phase: 'baseline' | 'first_signals' | 'pattern_recognition' | 'pre_close' | 'report_delivered' | 'expired';
  banner: {
    title: string;
    message: string;
    type: 'info' | 'success' | 'highlight' | 'warning';
    ctaText?: string;
    ctaLink?: string;
  } | null;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const PHASE_ICONS = {
  baseline: Activity,
  first_signals: TrendingUp,
  pattern_recognition: TrendingUp,
  pre_close: FileText,
  report_delivered: FileText,
  expired: AlertTriangle,
};

const BANNER_STYLES = {
  info: 'bg-primary/10 border-primary/30 text-foreground',
  success: 'bg-success/10 border-success/30 text-foreground',
  highlight: 'bg-accent/10 border-accent/30 text-foreground',
  warning: 'bg-warning/10 border-warning/30 text-foreground',
};

const ICON_STYLES = {
  info: 'text-primary',
  success: 'text-success',
  highlight: 'text-accent',
  warning: 'text-warning',
};

interface TrialBannerProps {
  className?: string;
  onDismiss?: () => void;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ className = '', onDismiss }) => {
  const [status, setStatus] = useState<TrialStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchTrialStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/trial/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setStatus(data.trial);
        }
      } catch (error) {
        console.error('[TrialBanner] Failed to fetch status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrialStatus();
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  // Don't show banner if:
  // - Still loading
  // - User is paid
  // - Banner was dismissed
  // - No banner config
  if (loading || status?.isPaid || dismissed || !status?.banner) {
    return null;
  }

  const PhaseIcon = PHASE_ICONS[status.phase] || Activity;
  const bannerStyle = BANNER_STYLES[status.banner.type] || BANNER_STYLES.info;
  const iconStyle = ICON_STYLES[status.banner.type] || ICON_STYLES.info;

  return (
    <div className={`border rounded-lg p-4 ${bannerStyle} ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 mt-0.5 ${iconStyle}`}>
            <PhaseIcon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm">{status.banner.title}</h4>
              {status.isActive && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-background/50 text-muted-foreground">
                  Day {status.currentDay} of 30
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {status.banner.message}
            </p>
            {status.banner.ctaText && status.banner.ctaLink && (
              <Link to={status.banner.ctaLink}>
                <Button variant="link" size="sm" className="h-auto p-0 mt-2">
                  {status.banner.ctaText}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </div>
        
        {/* Days remaining badge */}
        {status.isActive && status.daysRemaining > 0 && (
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">Trial ends in</p>
              <p className="text-sm font-semibold">{status.daysRemaining} days</p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Expired state - no dismiss button */}
        {status.phase === 'expired' && (
          <Link to="/pricing">
            <Button variant="default" size="sm">
              Choose a Plan
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

/**
 * Compact version for use in navigation or smaller spaces
 */
export const TrialBadge: React.FC = () => {
  const [status, setStatus] = useState<TrialStatus | null>(null);

  useEffect(() => {
    const fetchTrialStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/trial/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setStatus(data.trial);
        }
      } catch (error) {
        console.error('[TrialBadge] Failed to fetch status:', error);
      }
    };

    fetchTrialStatus();
  }, []);

  if (!status?.isActive || status?.isPaid) {
    return null;
  }

  return (
    <Link to="/pricing" className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
      <Clock className="w-3 h-3" />
      <span>{status.daysRemaining}d left</span>
    </Link>
  );
};

export default TrialBanner;
