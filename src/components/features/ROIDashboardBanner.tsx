import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

interface ROITile {
  id: string;
  label: string;
  value: number;
  formatted: string;
  icon: string;
  highlight?: boolean;
}

interface ROIBannerData {
  show: boolean;
  currency: string;
  currencySymbol: string;
  period: string;
  tiles: ROITile[];
  driftWarning?: {
    show: boolean;
    message: string;
    cost: string;
  } | null;
}

interface ROIDashboardBannerProps {
  orgId: string;
  onViewDetails?: () => void;
}

export const ROIDashboardBanner: React.FC<ROIDashboardBannerProps> = ({ orgId, onViewDetails }) => {
  const [data, setData] = useState<ROIBannerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchROI = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/roi/banner`);
        setData(response.data?.banner || response.data || null);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load ROI data');
      } finally {
        setLoading(false);
      }
    };

    if (orgId) {
      fetchROI();
    }
  }, [orgId]);

  if (loading) {
    return (
      <div className="roi-banner loading">
        <div className="spinner" />
        <span>Calculating ROI...</span>
      </div>
    );
  }

  if (error || !data || !data.show) {
    return null; // Hide banner on error or if show=false
  }

  const totalTile = (data.tiles || []).find((t) => t.highlight || t.id === 'total-savings');
  const metricTiles = (data.tiles || []).filter((t) => !t.highlight && t.id !== 'total-savings');

  return (
    <div className="roi-banner">
      <div className="roi-icon">💰</div>
      <div className="roi-content">
        <div className="roi-headline">
          <span className="label">Estimated {data.period || 'Monthly'} Savings</span>
          <span className="amount">{totalTile?.formatted || `${data.currencySymbol || '$'}0`}</span>
        </div>
        <div className="roi-details">
          {metricTiles.slice(0, 3).map((tile) => (
            <span key={tile.id} className="metric-tag">
              {tile.icon} {tile.label}: {tile.formatted}
            </span>
          ))}
          {data.driftWarning?.show && (
            <span className="drift-warning">⚠️ {data.driftWarning.message}</span>
          )}
        </div>
      </div>
      {onViewDetails && (
        <button className="view-details" onClick={onViewDetails}>
          View Details →
        </button>
      )}

      <style>{`
        .roi-banner {
          display: flex;
          align-items: center;
          gap: 16px;
          background: linear-gradient(135deg, #065f46 0%, #047857 100%);
          border: 1px solid #10b981;
          border-radius: 12px;
          padding: 16px 24px;
          margin-bottom: 24px;
        }

        .roi-banner.loading {
          justify-content: center;
          opacity: 0.7;
        }

        .roi-icon {
          font-size: 32px;
        }

        .roi-content {
          flex: 1;
        }

        .roi-headline {
          display: flex;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 4px;
        }

        .roi-headline .label {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
        }

        .roi-headline .amount {
          font-size: 24px;
          font-weight: 700;
          color: white;
        }

        .roi-details {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .roi-details .projected {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
        }

        .metric-tag {
          font-size: 11px;
          background: rgba(255, 255, 255, 0.15);
          padding: 2px 8px;
          border-radius: 4px;
          color: rgba(255, 255, 255, 0.9);
        }

        .view-details {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .view-details:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-right: 8px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ROIDashboardBanner;
