import { MouseEvent, ReactNode } from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { trackFunnelEvent } from '../lib/analytics';

export const PRIMARY_CTA_LABEL = 'Request a 20-minute psychosocial risk visibility review';
export const PRIMARY_CTA_PATH = '/psychosocial-risk-visibility-review#request-review';

interface CommercialLinkProps extends Omit<LinkProps, 'to'> {
  ctaLocation: string;
  children?: ReactNode;
}

export function PrimaryCommercialCTA({
  ctaLocation,
  className,
  children,
  onClick,
  ...linkProps
}: CommercialLinkProps) {
  return (
    <Link
      to={`/psychosocial-risk-visibility-review?cta=${encodeURIComponent(ctaLocation)}#request-review`}
      className={className}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        trackFunnelEvent('primary_cta_click', {
          cta_location: ctaLocation,
          cta_destination: '/psychosocial-risk-visibility-review#request-review',
        });
        onClick?.(event);
      }}
      {...linkProps}
    >
      {children || PRIMARY_CTA_LABEL}
    </Link>
  );
}

export function SampleReportCTA({
  ctaLocation,
  className,
  children,
  ...linkProps
}: CommercialLinkProps) {
  return (
    <Link to="/sample-report" className={className} data-cta-location={ctaLocation} {...linkProps}>
      {children || 'View a sample report'}
    </Link>
  );
}
