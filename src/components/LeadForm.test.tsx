import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import LeadForm from './LeadForm';
import api from '../utils/api';
import { trackFunnelEvent } from '../lib/analytics';

vi.mock('../utils/api', () => ({ default: { post: vi.fn() } }));
vi.mock('../lib/analytics', () => ({
  getOriginalAttribution: () => ({
    originalLandingPage: '/?utm_source=partner',
    referrer: 'https://partner.example/',
    source: 'partner',
    medium: 'email',
    campaign: 'risk-review',
    content: '',
    term: '',
    anonymousSessionId: 'session-123',
  }),
  trackFunnelEvent: vi.fn(),
}));

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/^Name/i), { target: { value: 'Jane Smith' } });
  fireEvent.change(screen.getByLabelText(/Work email/i), {
    target: { value: 'jane@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/Company/i), {
    target: { value: 'Example Ltd' },
  });
}

describe('LeadForm', () => {
  beforeEach(() => vi.clearAllMocks());

  test('confirms only after the server confirms successful persistence', async () => {
    let resolveRequest: (value: unknown) => void = () => {};
    vi.mocked(api.post).mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }) as ReturnType<typeof api.post>
    );
    render(<LeadForm ctaLocation="test_location" />);
    fillRequiredFields();
    fireEvent.submit(document.getElementById('commercial-lead-form')!);

    expect(trackFunnelEvent).not.toHaveBeenCalledWith('lead_submit_success', expect.anything());
    expect(trackFunnelEvent).not.toHaveBeenCalledWith('lead_confirmed', expect.anything());

    resolveRequest({
      data: {
        success: true,
        confirmed: true,
        leadId: 'lead-123',
        calendarLink: 'https://calendar.example/',
      },
    });
    expect(await screen.findByTestId('lead-confirmation')).toBeVisible();
    expect(trackFunnelEvent).toHaveBeenCalledWith(
      'lead_submit_success',
      expect.objectContaining({ cta_location: 'test_location' })
    );
    expect(trackFunnelEvent).toHaveBeenCalledWith(
      'lead_confirmed',
      expect.objectContaining({ cta_location: 'test_location' })
    );

    fireEvent.click(screen.getByRole('link', { name: /Choose a meeting time/i }));
    expect(trackFunnelEvent).toHaveBeenCalledWith(
      'booking_link_click',
      expect.objectContaining({ cta_location: 'lead_confirmation' })
    );
  });

  test('shows server failure and preserves entered values', async () => {
    vi.mocked(api.post).mockRejectedValue({ response: { status: 503, data: {} } });
    render(<LeadForm ctaLocation="test_location" />);
    fillRequiredFields();
    fireEvent.submit(document.getElementById('commercial-lead-form')!);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not send/i);
    expect(screen.getByLabelText(/^Name/i)).toHaveValue('Jane Smith');
    expect(trackFunnelEvent).toHaveBeenCalledWith(
      'lead_form_error',
      expect.objectContaining({ error_type: 'http_503' })
    );
    expect(trackFunnelEvent).not.toHaveBeenCalledWith('lead_confirmed', expect.anything());
  });

  test('shows field-specific validation errors without sending', () => {
    render(<LeadForm ctaLocation="test_location" />);
    fireEvent.submit(document.getElementById('commercial-lead-form')!);
    expect(screen.getByText('Enter your full name.')).toBeVisible();
    expect(screen.getByText('Enter your work email.')).toBeVisible();
    expect(screen.getByText('Enter your organisation.')).toBeVisible();
    expect(api.post).not.toHaveBeenCalled();
  });

  test('prevents duplicate submission while the first request is pending', () => {
    vi.mocked(api.post).mockReturnValue(new Promise(() => {}) as ReturnType<typeof api.post>);
    render(<LeadForm ctaLocation="test_location" />);
    fillRequiredFields();
    const form = document.getElementById('commercial-lead-form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  test('passes original attribution to the stored lead without putting PII in events', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { success: true, confirmed: true, leadId: 'lead-123' },
    });
    render(<LeadForm ctaLocation="product_hero" />);
    fillRequiredFields();
    fireEvent.submit(document.getElementById('commercial-lead-form')!);
    await screen.findByTestId('lead-confirmation');

    expect(api.post).toHaveBeenCalledWith(
      '/leads',
      expect.objectContaining({
        name: 'Jane Smith',
        attribution: expect.objectContaining({
          utmSource: 'partner',
          utmCampaign: 'risk-review',
          anonymousSessionId: 'session-123',
        }),
      })
    );
    for (const [, payload] of vi.mocked(trackFunnelEvent).mock.calls) {
      expect(JSON.stringify(payload)).not.toContain('Jane Smith');
      expect(JSON.stringify(payload)).not.toContain('jane@example.com');
      expect(payload).toMatchObject({ form_version: 'commercial_p0_v1', intent: 'free-preview' });
    }
  });

  test('does not render role or free-text fields in the initial form', () => {
    render(<LeadForm ctaLocation="test_location" />);
    expect(screen.queryByLabelText(/Role/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Message/i)).not.toBeInTheDocument();
  });
});

test.each([false, true])('retries the same enquiry identity only for unchanged details (edited=%s)', async (edited) => {
  vi.clearAllMocks();
  const stored = new Map<string, string>();
  vi.mocked(api.post).mockImplementation(async (_url, body) => {
    const payload = body as { submissionId: string; email: string };
    if (!stored.has(payload.submissionId)) stored.set(payload.submissionId, payload.email);
    if (vi.mocked(api.post).mock.calls.length === 1) throw new Error('Response lost after mocked persistence');
    return { data: { success: true, confirmed: true, leadId: 'mock-lead' } };
  });
  render(<LeadForm ctaLocation="test_location" />);
  fillRequiredFields();
  fireEvent.submit(document.getElementById('commercial-lead-form')!);
  await screen.findByRole('alert');
  if (edited) fireEvent.change(screen.getByLabelText(/Work email/i), {
    target: { value: 'corrected@example.com' },
  });
  await waitFor(() => expect(screen.getByRole('button', { name: /free/i })).not.toBeDisabled());
  fireEvent.submit(document.getElementById('commercial-lead-form')!);
  await screen.findByTestId('lead-confirmation');
  const first = vi.mocked(api.post).mock.calls[0][1] as { submissionId: string };
  const second = vi.mocked(api.post).mock.calls[1][1] as { submissionId: string };
  if (edited) {
    expect(second.submissionId).not.toBe(first.submissionId);
    expect(stored.get(second.submissionId)).toBe('corrected@example.com');
  } else {
    expect(second.submissionId).toBe(first.submissionId);
    expect(stored.size).toBe(1);
  }
});

test.each([
  { success: 'false', confirmed: true, leadId: 'mock' },
  { success: true, confirmed: 'false', leadId: 'mock' },
  { success: true, confirmed: true, leadId: '   ' },
  { success: true, confirmed: true, leadId: 123 },
  { success: true, confirmed: true },
])('does not confirm an invalid save receipt: %j', async (data) => {
  vi.clearAllMocks();
  vi.mocked(api.post).mockResolvedValueOnce({ data });
  render(<LeadForm ctaLocation="test_location" />);
  fillRequiredFields();
  fireEvent.submit(document.getElementById('commercial-lead-form')!);
  await screen.findByRole('alert');
  expect(screen.queryByTestId('lead-confirmation')).not.toBeInTheDocument();
  expect(screen.getByLabelText(/Work email/i)).toHaveValue('jane@example.com');
  expect(trackFunnelEvent).not.toHaveBeenCalledWith('lead_submit_success', expect.anything());
  expect(trackFunnelEvent).not.toHaveBeenCalledWith('lead_confirmed', expect.anything());
  vi.mocked(api.post).mockResolvedValueOnce({
    data: { success: true, confirmed: true, leadId: 'persisted-lead' },
  });
  fireEvent.submit(document.getElementById('commercial-lead-form')!);
  await screen.findByTestId('lead-confirmation');
  const calls = vi.mocked(api.post).mock.calls;
  expect(calls[1][1].submissionId).toBe(calls[0][1].submissionId);
});
