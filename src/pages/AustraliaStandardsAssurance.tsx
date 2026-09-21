import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import PageMeta from '../components/PageMeta';
import { Button } from '../components/ui/button';

const sources = [
  ['Safe Work Australia: Managing psychosocial risks', 'https://www.safeworkaustralia.gov.au/safety-topic/managing-health-and-safety/mental-health/managing-risks'],
  ['Safe Work Australia: Reviewing controls', 'https://www.safeworkaustralia.gov.au/book/health-care-and-social-assistance/managing-whs-risks/review-controls'],
  ['Comcare: Managing psychosocial hazards', 'https://www.comcare.gov.au/scheme-legislation/whs-act/regulatory-guides/managing-psychosocial-hazards'],
  ['ISO 45003:2021', 'https://www.iso.org/standard/64283.html'],
];

const principles = [
  ['Australian WHS risk-management cycle', 'SignalTrue is designed to add evidence to control review. It does not identify legal duties for you, determine compliance, or replace consultation with workers and HSRs.'],
  ['ISO 45003:2021', 'Our product and operating approach use the standard as a reference point for psychosocial-risk management within an OH&S management system. This is alignment work, not a claim of certification.'],
  ['ISO 45001 context', 'Evidence is structured so it can support an organisation’s existing OH&S management, review and continual-improvement processes rather than creating a parallel safety system.'],
  ['Privacy by design', 'SignalTrue is designed around aggregated organisational work-pattern evidence, data minimisation, purpose limitation, access controls and explicit prohibited uses. Deployment-specific privacy obligations still require customer review.'],
];

const boundaries = [
  'No diagnosis of burnout, stress, psychological injury or individual health.',
  'No individual psychosocial-risk or productivity score.',
  'No claim that a work-pattern change proves causation.',
  'No claim that SignalTrue makes an organisation WHS compliant.',
  'No claim that Australian law requires SignalTrue, continuous telemetry or any specific technology.',
  'No claim of ISO certification unless certification is independently obtained and current.',
];

export default function AustraliaStandardsAssurance() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageMeta
        title="Australian WHS, ISO 45003 and SignalTrue | Standards & Assurance"
        description="How SignalTrue relates to Australian psychosocial risk management, ISO 45003 and ISO 45001, with explicit product boundaries and privacy-conscious evidence principles."
        path="/au/standards-assurance"
        lang="en-AU"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-24">
          <div className="container mx-auto max-w-5xl px-6">
            <p className="text-caption font-bold uppercase tracking-wider text-brand">Standards & assurance</p>
            <h1 className="mt-3 max-w-4xl text-display font-bold tracking-tight text-[#0F172A]">
              Built to fit a serious psychosocial-risk process, not to replace one.
            </h1>
            <p className="mt-6 max-w-3xl text-lead leading-8 text-[#475569]">
              SignalTrue provides an additional evidence layer for organisations reviewing changes to work. The organisation keeps responsibility for hazard identification, risk assessment, consultation, controls and WHS decisions.
            </p>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] py-16 lg:py-20">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="grid gap-5 md:grid-cols-2">
              {principles.map(([title, copy]) => (
                <article key={title} className="rounded-container border border-[#E2E8F0] bg-white p-6">
                  <ShieldCheck className="h-6 w-6 text-brand" />
                  <h2 className="mt-4 text-lead font-bold text-[#0F172A]">{title}</h2>
                  <p className="mt-3 text-caption leading-6 text-[#475569]">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-20">
          <div className="container mx-auto max-w-4xl px-6">
            <h2 className="text-section font-bold text-[#0F172A]">Claims we deliberately do not make</h2>
            <p className="mt-4 leading-7 text-[#475569]">
              These boundaries are part of the product. They protect workers, customers and the quality of the decisions made from the evidence.
            </p>
            <div className="mt-8 grid gap-3">
              {boundaries.map((item) => (
                <div key={item} className="flex gap-3 rounded-container border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                  <p className="text-caption leading-6 text-[#334155]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] bg-[#F8FAFC] py-16 lg:py-20">
          <div className="container mx-auto max-w-4xl px-6">
            <h2 className="text-section font-bold text-[#0F172A]">Verify the basis yourself</h2>
            <p className="mt-4 leading-7 text-[#475569]">We would rather show the source than turn regulation or standards into a marketing badge. These are the primary references behind the Australian positioning above.</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {sources.map(([label, href]) => (
                <a key={href} href={href} target="_blank" rel="noreferrer" className="rounded-container border border-[#E2E8F0] bg-white p-4 text-caption font-semibold text-brand hover:border-[#93C5FD] hover:underline">{label}</a>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="container mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-section font-bold text-[#0F172A]">Evaluate the fit on one real control.</h2>
            <p className="mt-5 text-body text-[#475569]">
              Start with a control your organisation has already implemented and examine what evidence would be useful, what SignalTrue can observe and what still requires consultation and professional judgement.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link to="/au/8-week-pilot">See the 8-week control review pilot</Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
