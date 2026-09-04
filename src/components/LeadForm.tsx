import { FormEvent, useMemo, useRef, useState } from 'react';
import { Calendar, CheckCircle2, Send } from 'lucide-react';
import api from '../utils/api';
import { getOriginalAttribution, trackFunnelEvent } from '../lib/analytics';
import { PRIMARY_CTA_LABEL } from './CommercialCTA';

interface LeadFormProps {
  ctaLocation: string;
  source?: string;
  tag?: string;
  heading?: string;
  intro?: string;
  submitLabel?: string;
  plan?: string;
  intent?: string;
  formVersion?: string;
}

interface LeadFields {
  fullName: string;
  workEmail: string;
  organization: string;
  website: string;
}

type LeadFieldErrors = Partial<Record<keyof LeadFields, string>>;

const initialFields: LeadFields = {
  fullName: '',
  workEmail: '',
  organization: '',
  website: '',
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createSubmissionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `lead-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function validateLeadFields(fields: LeadFields): LeadFieldErrors {
  const errors: LeadFieldErrors = {};
  if (!fields.fullName.trim()) errors.fullName = 'Enter your full name.';
  if (!fields.workEmail.trim()) errors.workEmail = 'Enter your work email.';
  else if (!emailPattern.test(fields.workEmail.trim())) {
    errors.workEmail = 'Enter a valid work email address.';
  }
  if (!fields.organization.trim()) errors.organization = 'Enter your organisation.';
  return errors;
}

export default function LeadForm({
  ctaLocation,
  source = 'Website demo request',
  tag = 'psychosocial-risk-visibility-review',
  heading = 'Request your visibility review',
  intro = 'Tell us who should join the 20-minute conversation. We normally reply within one business day.',
  submitLabel = PRIMARY_CTA_LABEL,
  plan,
  intent = 'demo',
  formVersion = 'commercial_p0_v1',
}: LeadFormProps) {
  const [fields, setFields] = useState(initialFields);
  const [fieldErrors, setFieldErrors] = useState<LeadFieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [calendarLink, setCalendarLink] = useState('');
  const startedRef = useRef(false);
  const confirmedEventRef = useRef(false);
  const submissionInFlightRef = useRef(false);
  const lastValidationErrorRef = useRef('');
  const submissionIdRef = useRef(createSubmissionId());
  const attribution = useMemo(() => getOriginalAttribution(), []);
  const planAnalyticsParam = plan ? { plan } : {};

  const startForm = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackFunnelEvent('lead_form_start', {
      cta_location: ctaLocation,
      form_id: 'commercial-lead-form',
      intent,
      form_version: formVersion,
      ...planAnalyticsParam,
    });
  };

  const setField = (name: keyof LeadFields, value: string) => {
    startForm();
    setSubmitError('');
    lastValidationErrorRef.current = '';
    setFields((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submissionInFlightRef.current || submitting || confirmed) return;
    startForm();

    const errors = validateLeadFields(fields);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      const errorFields = Object.keys(errors).join(',');
      if (lastValidationErrorRef.current !== errorFields) {
        lastValidationErrorRef.current = errorFields;
        trackFunnelEvent('lead_form_error', {
          cta_location: ctaLocation,
          form_id: 'commercial-lead-form',
          error_type: 'validation',
          error_fields: errorFields,
          intent,
          form_version: formVersion,
          ...planAnalyticsParam,
        });
      }
      return;
    }

    submissionInFlightRef.current = true;
    setSubmitting(true);
    setSubmitError('');

    try {
      const response = await api.post('/leads', {
        name: fields.fullName.trim(),
        email: fields.workEmail.trim(),
        organization: fields.organization.trim(),
        title: '',
        challenge: '',
        source,
        tag: plan ? `${tag}:${plan}` : tag,
        website: fields.website,
        submissionId: submissionIdRef.current,
        attribution: {
          landingPage: attribution.originalLandingPage,
          referrer: attribution.referrer,
          cta: ctaLocation,
          utmSource: attribution.source,
          utmMedium: attribution.medium,
          utmCampaign: attribution.campaign,
          utmContent: attribution.content,
          utmTerm: attribution.term,
          anonymousSessionId: attribution.anonymousSessionId,
        },
        timestamp: new Date().toISOString(),
      });

      if (!response.data?.success || !response.data?.confirmed || !response.data?.leadId) {
        throw new Error('The server did not confirm the request.');
      }
      trackFunnelEvent('lead_submit_success', {
        cta_location: ctaLocation,
        form_id: 'commercial-lead-form',
        intent,
        form_version: formVersion,
        ...planAnalyticsParam,
      });
      setCalendarLink(response.data.calendarLink || '');
      setConfirmed(true);
      if (!confirmedEventRef.current) {
        confirmedEventRef.current = true;
        trackFunnelEvent('lead_confirmed', {
          cta_location: ctaLocation,
          form_id: 'commercial-lead-form',
          intent,
          form_version: formVersion,
          ...planAnalyticsParam,
        });
      }
    } catch (error) {
      const failure = error as {
        response?: { status?: number; data?: { fieldErrors?: LeadFieldErrors; message?: string } };
      };
      if (failure.response?.data?.fieldErrors) {
        setFieldErrors(failure.response.data.fieldErrors);
      }
      const errorType = failure.response?.status
        ? `http_${failure.response.status}`
        : 'network_error';
      trackFunnelEvent('lead_form_error', {
        cta_location: ctaLocation,
        form_id: 'commercial-lead-form',
        error_type: errorType,
        intent,
        form_version: formVersion,
        ...planAnalyticsParam,
      });
      setSubmitError(
        failure.response?.data?.message ||
          'We could not send your request. Your entries are still here—please try again or email hello@signaltrue.ai.'
      );
    } finally {
      submissionInFlightRef.current = false;
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <div className="py-8 text-center" data-testid="lead-confirmation">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-700" aria-hidden="true" />
        </div>
        <h2 className="text-lead font-bold text-[#0F172A]">Thanks. We received your request.</h2>
        <p className="mx-auto mt-3 max-w-xl text-[#475569]">
          Your details have been confirmed. We normally reply within one business day.
        </p>
        {calendarLink && (
          <a
            href={calendarLink}
            target="_blank"
            rel="noreferrer"
            onClick={() =>
              trackFunnelEvent('booking_link_click', {
                cta_location: 'lead_confirmation',
                form_id: 'commercial-lead-form',
                intent,
                form_version: formVersion,
              })
            }
            className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-brand px-6 py-3 font-bold text-white hover:bg-brand-hover"
          >
            <Calendar className="h-5 w-5" aria-hidden="true" /> Choose a meeting time
          </a>
        )}
      </div>
    );
  }

  const inputClass = (hasError: boolean) =>
    `w-full rounded-control border bg-white px-4 py-3 text-[#0F172A] outline-none transition focus:ring-2 focus:ring-brand/30 ${
      hasError ? 'border-red-500' : 'border-[#CBD5E1] focus:border-brand'
    }`;

  return (
    <div>
      <div className="mb-8 text-center">
        <h2 className="text-lead font-bold text-[#0F172A]">{heading}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-[#475569]">{intro}</p>
      </div>
      <form id="commercial-lead-form" onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field label="Work email" required error={fieldErrors.workEmail} htmlFor="lead-email">
          <input
            id="lead-email"
            name="workEmail"
            type="email"
            autoComplete="email"
            value={fields.workEmail}
            onChange={(event) => setField('workEmail', event.target.value)}
            aria-invalid={Boolean(fieldErrors.workEmail)}
            aria-describedby={fieldErrors.workEmail ? 'lead-email-error' : undefined}
            className={inputClass(Boolean(fieldErrors.workEmail))}
          />
        </Field>
        <Field
          label="Company"
          required
          error={fieldErrors.organization}
          htmlFor="lead-organization"
        >
          <input
            id="lead-organization"
            name="organization"
            autoComplete="organization"
            value={fields.organization}
            onChange={(event) => setField('organization', event.target.value)}
            aria-invalid={Boolean(fieldErrors.organization)}
            aria-describedby={fieldErrors.organization ? 'lead-organization-error' : undefined}
            className={inputClass(Boolean(fieldErrors.organization))}
          />
        </Field>
        <Field label="Name" required error={fieldErrors.fullName} htmlFor="lead-full-name">
          <input
            id="lead-full-name"
            name="fullName"
            autoComplete="name"
            value={fields.fullName}
            onChange={(event) => setField('fullName', event.target.value)}
            aria-invalid={Boolean(fieldErrors.fullName)}
            aria-describedby={fieldErrors.fullName ? 'lead-full-name-error' : undefined}
            className={inputClass(Boolean(fieldErrors.fullName))}
          />
        </Field>
        <div
          className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden"
          aria-hidden="true"
        >
          <label htmlFor="lead-website">Website</label>
          <input
            id="lead-website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={fields.website}
            onChange={(event) => setField('website', event.target.value)}
          />
        </div>
        {submitError && (
          <div
            className="rounded-control border border-red-200 bg-red-50 p-4 text-caption text-red-800"
            role="alert"
          >
            {submitError}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-brand px-6 py-3 font-bold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send className="h-5 w-5" aria-hidden="true" />
          {submitting ? 'Sending…' : submitLabel}
        </button>
        <p className="text-center text-caption leading-5 text-[#64748B]">
          We use these details only to respond about SignalTrue. Names, email addresses and company
          details are never sent to analytics.
        </p>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-caption font-semibold text-[#0F172A]">
        {label} {required && <span aria-hidden="true">*</span>}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-caption text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
