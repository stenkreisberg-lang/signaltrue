import { MouseEvent, ReactNode } from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { trackFunnelEvent } from '../lib/analytics';

export const PRIMARY_CTA_LABEL = 'Start the AU$99 founding review';
export const PRIMARY_CTA_PATH = '/contact?intent=au-founding-review';

interface CommercialLinkProps extends Omit<LinkProps, 'to'> {
  ctaLocation: string;
  children?: ReactNode;
  queryParams?: Record<string, string | undefined>;
}

export function PrimaryCommercialCTA({
  ctaLocation,
  className,
  children,
  queryParams,
  onClick,
  state,
  ...linkProps
}: CommercialLinkProps) {
  const search = new URLSearchParams();
  search.set('intent', queryParams?.intent || 'au-founding-review');
  if (queryParams?.plan) search.set('plan', queryParams.plan);
  const destination = `/contact?${search.toString()}`;
  const navigationState = {
    ...(state && typeof state === 'object' ? state : {}),
    signaltrueCtaLocation: ctaLocation,
  };

  return (
    <Link
      to={destination}
      state={navigationState}
      className={className}
      data-primary-cta="true"
      data-cta-location={ctaLocation}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        trackFunnelEvent('primary_cta_click', {
          cta_location: ctaLocation,
          cta_destination: destination,
          ...(queryParams?.plan ? { plan: queryParams.plan } : {}),
          intent: queryParams?.intent || 'au-founding-review',
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
  onClick,
  ...linkProps
}: CommercialLinkProps) {
  return (
    <Link
      to="/sample-report"
      className={className}
      data-cta-location={ctaLocation}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        trackFunnelEvent('sample_report_click', {
          cta_location: ctaLocation,
          cta_destination: '/sample-report',
        });
        onClick?.(event);
      }}
      {...linkProps}
    >
      {children || 'See the sample control-review report'}
    </Link>
  );
}
