import { ArrowRight, BookOpen, FlaskConical, Globe2, MessageSquareText } from 'lucide-react';
import { Link } from 'react-router-dom';

const paths = [
  {
    icon: MessageSquareText,
    eyebrow: 'Ask',
    title: 'Ask SignalTrue',
    copy: 'Bring a real control-review question. Get a constrained answer with named sources where available.',
    href: '/ask',
    cta: 'Ask a question',
  },
  {
    icon: Globe2,
    eyebrow: 'Jurisdiction',
    title: 'See what your market expects',
    copy: 'Compare the review logic for Australia, the UK and Estonia with direct regulator or legal sources.',
    href: '/jurisdictions/australia',
    cta: 'Open jurisdiction guides',
  },
  {
    icon: BookOpen,
    eyebrow: 'Control library',
    title: 'Start from the intervention',
    copy: 'Pick a hazard and control, then see the expected effect, evidence, migration risks and worker questions.',
    href: '/controls',
    cta: 'Browse controls',
  },
  {
    icon: FlaskConical,
    eyebrow: 'Research',
    title: 'SignalTrue Labs',
    copy: 'See how SignalTrue is building an anonymous evidence base around control effectiveness without inventing benchmarks.',
    href: '/labs',
    cta: 'See the research method',
  },
];

export default function InboundDiscoverySection() {
  return (
    <section className="border-y border-[#E2E8F0] bg-[#F8FAFC] py-16 lg:py-20">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-caption font-bold uppercase tracking-wider text-brand">
              Explore before you book anything
            </p>
            <h2 className="mt-3 text-section font-bold sm:text-display">
              Bring your actual problem. SignalTrue should be useful before the sales call.
            </h2>
            <p className="mt-4 text-body leading-8 text-[#475569]">
              Check a control, ask a difficult question, inspect the jurisdiction logic, or see the
              research method. None of these require employee-level data.
            </p>
          </div>

          <div className="mt-9 grid gap-5 md:grid-cols-2">
            {paths.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="group rounded-container border border-[#E2E8F0] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-soft hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-control bg-brand-softer p-3">
                    <item.icon className="h-5 w-5 text-brand" />
                  </div>
                  <div>
                    <p className="text-caption font-bold uppercase tracking-wider text-brand">
                      {item.eyebrow}
                    </p>
                    <h3 className="mt-1 text-subsection font-bold text-[#0F172A]">{item.title}</h3>
                    <p className="mt-2 text-caption leading-6 text-[#64748B]">{item.copy}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-caption font-bold text-brand">
                      {item.cta}
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
