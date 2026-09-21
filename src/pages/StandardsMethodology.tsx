import { CheckCircle2, Globe2, ShieldCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import PageMeta from '../components/PageMeta';
import { Button } from '../components/ui/button';

const method = [
  ['1', 'Define the control', 'Record what changed, who owns it, what work condition it is intended to change and when it should be reviewed.'],
  ['2', 'Observe', 'Compare qualified, aggregated team work patterns before and after the change. Keep measured evidence separate from interpretation.'],
  ['3', 'Interpret', 'Check persistence, data quality, plausible operational explanations and whether demand may have migrated to another channel, time or team.'],
  ['4', 'Validate with people', 'Take the observation and its limitations to workers, representatives and accountable leaders. SignalTrue evidence is not a substitute for consultation.'],
  ['5', 'Decide and review', 'Use the combined evidence to support a maintain, modify, investigate or replace decision, then record the review.'],
];

const standards = [
  ['ISO 45003', 'Psychosocial risk-management guidance', 'The workflow is designed around organisational context, psychosocial risk, worker participation, controls, monitoring, review and continual improvement.'],
  ['ISO 45001', 'OH&S management-system context', 'SignalTrue is designed to contribute evidence to an existing OH&S management system rather than create a parallel compliance system.'],
  ['Privacy by design', 'Data minimisation and purpose limitation', 'Team-level evidence, explicit purpose, controlled access and prohibited uses are part of the deployment model. Local privacy and employment requirements still need customer review.'],
  ['Human validation', 'Observation is not conclusion', 'A measured pattern is interpreted in context and validated with people before it becomes part of a management decision.'],
];

const jurisdictions = [
  ['Australia', 'Use the same core method inside the organisation’s WHS psychosocial risk and control-review process, with Australian and state/territory deployment checks where relevant.', '/au'],
  ['European Union', 'Use the same method with GDPR, DPIA, worker-representation and national employment/privacy requirements considered during deployment.', null],
  ['United Kingdom', 'Use the same method alongside the organisation’s H&S risk process, HSE stress-management context, UK GDPR and worker-monitoring obligations.', null],
  ['New Zealand & other markets', 'The core product remains the same. Deployment adds the applicable local privacy, employment, consultation and H&S requirements rather than changing the evidence method.', null],
];

export default function StandardsMethodology() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageMeta
        title="Standards & Methodology | SignalTrue"
        description="SignalTrue's global control-review methodology: ISO 45003-informed, compatible with an ISO 45001 OH&S context, privacy-conscious and adaptable to local jurisdiction requirements."
        path="/standards"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-24">
          <div className="container mx-auto max-w-5xl px-6">
            <p className="text-caption font-bold uppercase tracking-wider text-brand">Standards & methodology</p>
            <h1 className="mt-3 max-w-4xl text-display font-bold tracking-tight text-[#0F172A]">One evidence method. Adapted to the rules where you operate.</h1>
            <p className="mt-6 max-w-3xl text-lead leading-8 text-[#475569]">SignalTrue is a global control-review product. The core method stays the same across markets: define the control, observe what changed, interpret the evidence, validate it with people, then support a review decision. Jurisdiction-specific packs add the local WHS, health and safety, privacy, employment and consultation context.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {['ISO 45003-informed', 'ISO 45001 OH&S context', 'Privacy by design', 'Jurisdiction-aware', 'Human validation'].map((item) => <span key={item} className="rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2 text-caption font-semibold text-[#1E40AF]">{item}</span>)}
            </div>
            <p className="mt-5 max-w-3xl text-caption leading-6 text-[#64748B]">These statements describe product design and methodology. SignalTrue is not claiming ISO certification, regulator endorsement or that use of the product establishes legal compliance.</p>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] py-16 lg:py-20">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="max-w-3xl"><p className="text-caption font-bold uppercase tracking-wider text-brand">The SignalTrue method</p><h2 className="mt-3 text-section font-bold text-[#0F172A]">Evidence should lead to a decision, not another dashboard.</h2></div>
            <div className="mt-10 grid gap-4 lg:grid-cols-5">
              {method.map(([n,title,copy]) => <article key={n} className="rounded-container border border-[#E2E8F0] bg-white p-5"><p className="text-caption font-bold text-brand">{n}</p><h3 className="mt-2 font-bold text-[#0F172A]">{title}</h3><p className="mt-3 text-caption leading-6 text-[#475569]">{copy}</p></article>)}
            </div>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-20">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="max-w-3xl"><p className="text-caption font-bold uppercase tracking-wider text-brand">Standards-informed by design</p><h2 className="mt-3 text-section font-bold text-[#0F172A]">The standard is reflected in the workflow, not used as a marketing badge.</h2></div>
            <div className="mt-9 grid gap-5 md:grid-cols-2">
              {standards.map(([title,sub,copy]) => <article key={title} className="rounded-container border border-[#E2E8F0] bg-[#F8FAFC] p-6"><ShieldCheck className="h-6 w-6 text-brand"/><h3 className="mt-4 text-lead font-bold text-[#0F172A]">{title}</h3><p className="mt-1 text-caption font-semibold text-brand">{sub}</p><p className="mt-3 text-caption leading-6 text-[#475569]">{copy}</p></article>)}
            </div>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] py-16 lg:py-20">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="max-w-3xl"><Globe2 className="h-7 w-7 text-brand"/><h2 className="mt-4 text-section font-bold text-[#0F172A]">Global product. Local deployment context.</h2><p className="mt-4 leading-7 text-[#475569]">A buyer in Sydney, London, Helsinki, Auckland or São Paulo should not receive a different core product. What changes is the deployment checklist and the local regulatory context that the customer must verify.</p></div>
            <div className="mt-9 grid gap-4 md:grid-cols-2">
              {jurisdictions.map(([title,copy,href]) => <article key={title} className="rounded-container border border-[#E2E8F0] bg-white p-6"><h3 className="font-bold text-[#0F172A]">{title}</h3><p className="mt-3 text-caption leading-6 text-[#475569]">{copy}</p>{href && <Link to={href} className="mt-4 inline-flex items-center text-caption font-bold text-brand hover:underline">See the local context <ArrowRight className="ml-1.5 h-4 w-4"/></Link>}</article>)}
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="container mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-section font-bold text-[#0F172A]">Start with the method. Then apply the local context.</h2>
            <p className="mt-4 text-[#475569]">Bring one control your organisation has implemented. SignalTrue can map the evidence question first, then the relevant deployment requirements for where your people work.</p>
            <Button asChild size="lg" className="mt-7"><Link to="/control-evidence-assessment">Review one control <ArrowRight className="ml-2 h-4 w-4"/></Link></Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
