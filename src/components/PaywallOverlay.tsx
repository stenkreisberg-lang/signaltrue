import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

interface PaywallStatus {
  isActive: boolean;
  reason: 'trial_expired' | 'report_viewed' | null;
  accessible: string[];
  locked: Array<{
    feature: string;
    label: string;
    description: string;
  }>;
  cta: {
    headline: string;
    buttonText: string;
    subtext: string;
    link: string;
  } | null;
}

interface PaywallOverlayProps {
  feature?: string; // Optional: specific feature being blocked
  className?: string;
  children: React.ReactNode;
}

/**
 * PaywallOverlay - Wraps content that should be locked behind paywall
 * 
 * Usage:
 * <PaywallOverlay feature="ai_recommendations">
 *   <AIRecommendationsPanel />
 * </PaywallOverlay>
 */
export const PaywallOverlay: React.FC<PaywallOverlayProps> = ({ 
  feature, 
  className = '',
  children 
}) => {
  const [status, setStatus] = useState<PaywallStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPaywallStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/trial/paywall-status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setStatus(data.paywall);
        }
      } catch (error) {
        console.error('[PaywallOverlay] Failed to fetch status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaywallStatus();
  }, []);

  // If loading or no paywall, show children normally
  if (loading || !status?.isActive) {
    return <>{children}</>;
  }

  // Check if this specific feature is locked
  const isFeatureLocked = feature 
    ? status.locked.some(l => l.feature === feature)
    : true;

  if (!isFeatureLocked) {
    return <>{children}</>;
  }

  // Find the locked feature info
  const lockedFeature = feature 
    ? status.locked.find(l => l.feature === feature)
    : status.locked[0];

  return (
    <div className={`relative ${className}`}>
      {/* Blurred content */}
      <div className="opacity-30 blur-sm pointer-events-none select-none">
        {children}
      </div>
      
      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-background/50 to-background/90">
        <div className="text-center max-w-md p-6">
          <div className="w-12 h-12 rounded-full bg-muted/50 mx-auto mb-4 flex items-center justify-center">
            <Lock className="w-6 h-6 text-muted-foreground" />
          </div>
          
          {lockedFeature && (
            <>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                {lockedFeature.label}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {lockedFeature.description}
              </p>
            </>
          )}
          
          {status.cta && (
            <>
              <p className="text-sm font-medium text-foreground mb-4">
                {status.cta.headline}
              </p>
              <Link to={status.cta.link}>
                <Button variant="hero" size="lg">
                  {status.cta.buttonText}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground mt-3">
                {status.cta.subtext}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * PaywallBanner - Full-width banner for locked sections
 */
interface PaywallBannerProps {
  className?: string;
}

export const PaywallBanner: React.FC<PaywallBannerProps> = ({ className = '' }) => {
  const [status, setStatus] = useState<PaywallStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPaywallStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/trial/paywall-status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setStatus(data.paywall);
        }
      } catch (error) {
        console.error('[PaywallBanner] Failed to fetch status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaywallStatus();
  }, []);

  if (loading || !status?.isActive || !status.cta) {
    return null;
  }

  return (
    <div className={`bg-warning/10 border border-warning/30 rounded-xl p-6 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground mb-1">
              {status.cta.headline}
            </h3>
            <p className="text-sm text-muted-foreground">
              {status.cta.subtext}
            </p>
          </div>
        </div>
        
        <Link to={status.cta.link}>
          <Button variant="hero">
            {status.cta.buttonText}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
      
      {/* Locked features list */}
      {status.locked.length > 0 && (
        <div className="mt-4 pt-4 border-t border-warning/20">
          <p className="text-xs text-muted-foreground mb-2">Features requiring upgrade:</p>
          <div className="flex flex-wrap gap-2">
            {status.locked.map((feature) => (
              <span 
                key={feature.feature}
                className="text-xs px-2 py-1 rounded-full bg-muted/50 text-muted-foreground"
              >
                {feature.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * PaywallCard - Compact card showing what's locked and accessible
 */
interface PaywallCardProps {
  className?: string;
}

export const PaywallCard: React.FC<PaywallCardProps> = ({ className = '' }) => {
  const [status, setStatus] = useState<PaywallStatus | null>(null);

  useEffect(() => {
    const fetchPaywallStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/trial/paywall-status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setStatus(data.paywall);
        }
      } catch (error) {
        console.error('[PaywallCard] Failed to fetch status:', error);
      }
    };

    fetchPaywallStatus();
  }, []);

  if (!status?.isActive) return null;

  return (
    <div className={`bg-card rounded-xl border border-border/50 p-6 ${className}`}>
      <h3 className="font-display font-semibold text-foreground mb-4">
        Your access level
      </h3>
      
      {/* Accessible features */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Available</p>
        <div className="space-y-2">
          {status.accessible.map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-foreground capitalize">{feature.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Locked features */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Requires upgrade</p>
        <div className="space-y-2">
          {status.locked.slice(0, 3).map((feature) => (
            <div key={feature.feature} className="flex items-center gap-2 text-sm">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{feature.label}</span>
            </div>
          ))}
          {status.locked.length > 3 && (
            <p className="text-xs text-muted-foreground pl-6">
              +{status.locked.length - 3} more features
            </p>
          )}
        </div>
      </div>
      
      {/* CTA */}
      {status.cta && (
        <Link to={status.cta.link}>
          <Button variant="default" size="sm" className="w-full">
            {status.cta.buttonText}
            <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      )}
    </div>
  );
};

export default PaywallOverlay;
