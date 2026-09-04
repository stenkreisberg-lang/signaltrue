import { Calendar, Mail, MessageSquare } from 'lucide-react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import LeadForm from '../components/LeadForm';
import Navbar from '../components/Navbar';
import PageMeta from '../components/PageMeta';

const ALLOWED_INTENTS = new Set(['demo', 'pilot', 'pricing', 'security-review', 'au-pilot']);

export function normalizeContactIntent(value: string | null) {
  const normalized = (value || 'demo').split('?')[0].trim().toLowerCase();
  return ALLOWED_INTENTS.has(normalized) ? normalized : 'demo';
}

export default function Contact() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const rawIntent = searchParams.get('intent');
  const intent = normalizeContactIntent(rawIntent);
  const routeState = location.state as { signaltrueCtaLocation?: string } | null;
  const ctaLocation =
    routeState?.signaltrueCtaLocation || searchParams.get('cta') || 'direct_contact';
  const plan = searchParams.get('plan') || undefined;

  useEffect(() => {
    if (!rawIntent || rawIntent === intent) return;
    const canonicalParams = new URLSearchParams(location.search);
    canonicalParams.set('intent', intent);
    navigate(
      { pathname: '/contact', search: `?${canonicalParams.toString()}` },
      { replace: true, state: location.state }
    );
  }, [intent, location.search, location.state, navigate, rawIntent]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageMeta
        title="Contact SignalTrue | Sales, Privacy and Support"
        description="Contact SignalTrue for general enquiries, customer support, privacy questions or a 20-minute psychosocial risk visibility review."
        path="/contact"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white py-14 lg:py-16">
          <div className="container mx-auto px-6 text-center">
            <p className="text-caption font-bold uppercase tracking-wider text-brand">
              Contact SignalTrue
            </p>
            <h1 className="mx-auto mt-4 max-w-4xl text-display font-bold text-[#0F172A] sm:text-display">
              Start with the right conversation.
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-lead leading-8 text-[#475569]">
              Use the request form for a commercial conversation, or contact the relevant team
              directly for general, privacy, or customer-support questions.
            </p>
          </div>
        </section>

        <section className="py-12 lg:py-16">
          <div className="container mx-auto px-6">
            <div className="mx-auto mb-10 grid max-w-5xl gap-5 md:grid-cols-3">
              {[
                [Mail, 'General enquiries', 'hello@signaltrue.ai', 'mailto:hello@signaltrue.ai'],
                [
                  Calendar,
                  'Visibility review',
                  'Use the request form below',
                  '#commercial-lead-form',
                ],
                [
                  MessageSquare,
                  'Customer support',
                  'support@signaltrue.ai',
                  'mailto:support@signaltrue.ai',
                ],
              ].map(([Icon, title, copy, href]) => {
                const ContactIcon = Icon as typeof Mail;
                return (
                  <article
                    key={String(title)}
                    className="rounded-container border border-[#E2E8F0] bg-white p-6 text-center"
                  >
                    <ContactIcon className="mx-auto h-6 w-6 text-brand" aria-hidden="true" />
                    <h2 className="mt-3 font-bold text-[#0F172A]">{String(title)}</h2>
                    <a
                      href={String(href)}
                      className="mt-2 inline-block text-caption text-brand hover:underline"
                    >
                      {String(copy)}
                    </a>
                  </article>
                );
              })}
            </div>
            <div
              id="visibility-review"
              className="mx-auto max-w-3xl rounded-container border border-[#E2E8F0] bg-white p-7 shadow-sm md:p-10"
            >
              <LeadForm
                ctaLocation={ctaLocation}
                intent={intent}
                plan={plan}
                formVersion="contact_p0_v1"
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
