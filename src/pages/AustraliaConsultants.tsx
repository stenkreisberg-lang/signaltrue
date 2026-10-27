import { ArrowRight, ClipboardCheck, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import PageMeta from '../components/PageMeta';

const steps = [
  ['Define the question', 'Agree which work-design control was introduced and what observable change was intended.'],
  ['Check the evidence', 'Review available baselines, team-level data coverage and worker consultation before interpreting changes.'],
  ['Interpret with care', 'Discuss alternative explanations, limitations and whether the control needs further investigation.'],
  ['Decide together', 'Document the client’s review decision and the next review date.'],
];

export default function AustraliaConsultants() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <PageMeta
        title="For Australian Psychosocial Risk Consultants | SignalTrue"
        description="Explore how approved, aggregated work-pattern evidence could complement psychosocial risk assessment and control reviews for your employer clients."
        path="/au/consultants"
        lang="en-AU"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-24">
          <div className="container mx-auto max-w-5xl px-6">
            <p className="text-caption font-bold uppercase tracking-wider text-brand">For Australian WHS and psychosocial-risk consultants</p>
            <h1 className="mt-4 max-w-4xl text-section font-bold sm:text-display">After the assessment, what changed in the work?</h1>
            <p className="mt-6 max-w-3xl text-lead leading-8 text-[#475569]">
              Your professional assessment and worker consultation remain central. SignalTrue explores whether approved, aggregated calendar and collaboration patterns can add useful supplementary evidence when an employer reviews a work-design control.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="inline-flex min-h-12 items-center gap-2 rounded-control bg-brand px-6 py-3 font-semibold text-white" to="/did-the-control-work">
                Review the evidence gaps <ArrowRight className="h-4 w-4" />
              </Link>
              <Link className="inline-flex min-h-12 items-center rounded-control border border-[#CBD5E1] px-6 py-3 font-semibold" to="/contact?intent=consultant-partnership">
                Explore a partnership
              </Link>
            </div>
          </div>
        </section>
        <section className="container mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-section font-bold">Complementary evidence, not a replacement for your judgement</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              [ClipboardCheck, 'Your expertise', 'Risk assessment, control design, consultation, interpretation and advice remain with qualified professionals.'],
              [Users, 'Potential evidence layer', 'With the employer’s approval, SignalTrue can examine selected team-level work patterns, coverage and changes over time.'],
              [ShieldCheck, 'Boundaries', 'Work patterns cannot establish subjective experience, legal compliance or causation. Privacy, worker transparency and minimum group sizes matter.'],
            ].map(([Icon, title, description]) => {
              const CardIcon = Icon as typeof Users;
              return (
                <article key={String(title)} className="rounded-container border border-[#E2E8F0] bg-white p-6">
                  <CardIcon className="h-6 w-6 text-brand" />
                  <h3 className="mt-4 text-lead font-bold">{String(title)}</h3>
                  <p className="mt-3 text-caption leading-6 text-[#475569]">{String(description)}</p>
                </article>
              );
            })}
          </div>
        </section>
        <section className="border-y border-[#E2E8F0] bg-white py-16">
          <div className="container mx-auto max-w-5xl px-6">
            <h2 className="text-section font-bold">A practical client control review</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {steps.map(([title, description], index) => (
                <div key={title} className="rounded-container border border-[#E2E8F0] p-6">
                  <p className="text-caption font-bold text-brand">Step {index + 1}</p>
                  <h3 className="mt-2 text-lead font-bold">{title}</h3>
                  <p className="mt-3 text-caption leading-6 text-[#475569]">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="container mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-section font-bold">Explore a clearly scoped FREE pilot with a client</h2>
          <p className="mt-4 max-w-3xl leading-7 text-[#475569]">
            A pilot is free, subject to employer permission, privacy and security review, an agreed evidence question and explicit success criteria. It is not a compliance certificate or a promise of a commercial partnership. Any later product arrangement is separate.
          </p>
          <div className="mt-7 flex flex-wrap gap-4">
            <Link className="font-semibold text-brand underline underline-offset-4" to="/au/8-week-pilot">Understand the free pilot</Link>
            <Link className="font-semibold text-brand underline underline-offset-4" to="/sample-report">See an illustrative report</Link>
            <Link className="font-semibold text-brand underline underline-offset-4" to="/contact?intent=consultant-partnership">Ask about consultant collaboration</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
