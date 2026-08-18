import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageMeta from '../components/PageMeta';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, Clock3, Moon, Users, Network, Layers } from 'lucide-react';

/*
 * Australian Health & Safety landing page.
 *
 * Positioning boundary for anyone editing this page: SignalTrue provides an
 * additional source of evidence for psychosocial risk management. It does not
 * determine that a psychosocial hazard exists, does not replace worker
 * consultation or risk assessment, and must not claim to make an employer
 * compliant with WHS, privacy or workplace surveillance obligations — those
 * vary by jurisdiction and remain the customer's responsibility.
 */

const observable = [
  { icon: Clock3, label: 'Meeting demand increasing over time' },
  { icon: Layers, label: 'Uninterrupted focus time declining' },
  { icon: Moon, label: 'After-hours activity becoming persistent' },
  { icon: Users, label: 'Manager coordination load increasing' },
  { icon: Network, label: 'Collaboration patterns materially changing' },
  { icon: CalendarClock, label: 'Several workload-related patterns moving together' },
];

const notDoing = [
  'No reading of employee messages',
  'No individual productivity scoring',
  'No employee rankings',
  'No psychological profiling',
];

export default function AustraliaPsychosocialRisk() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageMeta
        title="Psychosocial Risk Work-Pattern Monitoring Australia | SignalTrue"
        description="Continuous team-level visibility into meeting load, focus time, after-hours work and manager capacity. Additional evidence for Australian psychosocial risk management without reading employee messages."
        path="/australia-psychosocial-risk"
      />
      <Navbar />

      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-24">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-4xl text-center">
              <p className="mb-4 text-sm font-bold uppercase tracking-wider text-[#1D4ED8]">
                For Australian Health &amp; Safety teams
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-[#0F172A] sm:text-5xl">
                See changing job-demand patterns between psychosocial risk assessments.
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#475569]">
                SignalTrue provides continuous team-level visibility into digital work patterns such
                as meeting load, focus time, after-hours work and manager coordination — without
                reading messages or monitoring individual productivity.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Button asChild size="lg">
                  <Link to="/contact?intent=pilot&amp;cta=australia_hero">
                    Discuss an Australian pilot <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/sample-report">See a sample report</Link>
                </Button>
              </div>
              <p className="mt-6 text-sm text-[#64748B]">
                Metadata only · Team-level signals · No message content · No employee scoring
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] py-16">
          <div className="container mx-auto max-w-4xl px-6">
            <h2 className="text-3xl font-bold text-[#0F172A]">
              Psychosocial risk management needs more than a snapshot.
            </h2>
            <div className="mt-5 space-y-4 text-[#475569]">
              <p>
                Australian organisations use worker consultation, risk assessment and other sources
                of information to identify and manage psychosocial hazards. But high job demands and
                changing work design can develop continuously.
              </p>
              <p>
                SignalTrue provides an additional source of evidence by showing how digital working
                patterns change over time.
              </p>
              <p className="text-sm">
                Safe Work Australia identifies high job demands as a psychosocial hazard and
                highlights factors including long working hours and excessive workload. Australian
                guidance also emphasises reviewing whether controls are working.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] bg-white py-16">
          <div className="container mx-auto max-w-5xl px-6">
            <h2 className="text-3xl font-bold text-[#0F172A]">What SignalTrue can help you see</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {observable.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5"
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#1D4ED8]" />
                  <span className="text-[#334155]">{label}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-[#78350F]">
              SignalTrue does not determine that a psychosocial hazard exists. It shows observable
              work-pattern changes that may warrant further investigation.
            </p>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] py-16">
          <div className="container mx-auto max-w-4xl px-6">
            <h2 className="text-3xl font-bold text-[#0F172A]">
              Use operational evidence alongside worker consultation.
            </h2>
            <div className="mt-5 space-y-4 text-[#475569]">
              <p>
                Work-pattern metadata cannot explain why a change is happening. Workers and managers
                provide the context.
              </p>
              <p>
                SignalTrue helps organisations identify where there may be something worth
                investigating, and provides another source of evidence when reviewing whether action
                has changed the system of work.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] bg-white py-16">
          <div className="container mx-auto max-w-4xl px-6">
            <h2 className="text-3xl font-bold text-[#0F172A]">
              Visibility without employee surveillance.
            </h2>
            <p className="mt-5 text-[#475569]">
              SignalTrue is designed around team-level patterns.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {notDoing.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-[#334155]"
                >
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[#475569]">
              The objective is to improve visibility into the system of work, not to evaluate
              individual workers.
            </p>
            <p className="mt-4 text-sm text-[#64748B]">
              Australian workplace monitoring and privacy requirements vary by jurisdiction.
              Introducing workplace technology remains the employer&apos;s responsibility, including
              appropriate employee communication, consultation, policies and legal assessment.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-3xl font-bold text-[#0F172A]">Test the use case with one team.</h2>
            <p className="mt-5 text-[#475569]">
              Run a focused pilot to understand whether continuous work-pattern evidence adds useful
              visibility alongside your existing psychosocial risk processes.
            </p>
            <p className="mt-3 text-sm text-[#64748B]">
              Australian pilot pricing available on request.
            </p>
            <div className="mt-8">
              <Button asChild size="lg">
                <Link to="/contact?intent=pilot&amp;cta=australia_final">
                  Discuss an Australian pilot <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
