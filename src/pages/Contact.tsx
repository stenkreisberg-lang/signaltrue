import { Calendar, Mail, MessageSquare } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import Footer from '../components/Footer';
import LeadForm from '../components/LeadForm';
import Navbar from '../components/Navbar';
import PageMeta from '../components/PageMeta';

export default function Contact() {
  const location = useLocation();
  const ctaLocation = new URLSearchParams(location.search).get('cta') || 'direct_contact';

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageMeta
        title="Request a Psychosocial Risk Visibility Review | SignalTrue"
        description="Request a 20-minute SignalTrue review of gaps between formal psychosocial risk assessments and team-level work-pattern evidence."
        path="/contact"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white py-14 lg:py-16">
          <div className="container mx-auto px-6 text-center">
            <p className="text-caption font-bold uppercase tracking-wider text-brand">
              Psychosocial risk visibility review
            </p>
            <h1 className="mx-auto mt-4 max-w-4xl text-display font-bold text-[#0F172A] sm:text-display">
              Bring one gap in your current psychosocial-risk process.
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-lead leading-8 text-[#475569]">
              In 20 minutes, we will discuss the process you already use, an example of the
              conditions SignalTrue can identify, and whether a controlled pilot is justified.
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
            <div className="mx-auto max-w-3xl rounded-container border border-[#E2E8F0] bg-white p-7 shadow-sm md:p-10">
              <LeadForm ctaLocation={ctaLocation} />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
