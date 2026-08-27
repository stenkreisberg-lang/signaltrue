import { fireEvent, render, screen } from '@testing-library/react';
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
  fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'Jane Smith' } });
  fireEvent.change(screen.getByLabelText(/Work email/i), {
    target: { value: 'jane@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/Organisation/i), {
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

    expect(trackFunnelEvent).toHaveBeenCalledWith(
      'lead_form_submit',
      expect.objectContaining({ cta_location: 'test_location' })
    );
    expect(trackFunnelEvent).not.toHaveBeenCalledWith('lead_confirmed', expect.anything());

    resolveRequest({ data: { success: true, calendarLink: 'https://calendar.example/' } });
    expect(await screen.findByTestId('lead-confirmation')).toBeVisible();
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
    expect(screen.getByLabelText(/Full name/i)).toHaveValue('Jane Smith');
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
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
    render(<LeadForm ctaLocation="product_hero" />);
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/Message/i), { target: { value: 'Private message' } });
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
      expect(JSON.stringify(payload)).not.toContain('Private message');
    }
  });
});
