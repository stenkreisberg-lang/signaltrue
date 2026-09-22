import { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageMeta from '../components/PageMeta';
import { CONTROL_LIBRARY, HAZARDS, controlPath } from '../content/controlLibrary';

export default function ControlLibrary() {
  const [query, setQuery] = useState('');
  const [hazard, setHazard] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CONTROL_LIBRARY.filter((entry) => {
      const hazardMatch = !hazard || entry.hazardSlug === hazard;
      const queryMatch =
        !q ||
        [entry.hazard, entry.control, entry.intent, entry.expectedEffect, ...entry.indicators]
          .join(' ')
          .toLowerCase()
          .includes(q);
      return hazardMatch && queryMatch;
    });
  }, [hazard, query]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <PageMeta
        title="Psychosocial Control Library | SignalTrue"
        description="Practical psychosocial control review guides: expected effects, evidence to collect, workload migration risks, review timing, and worker consultation questions."
        path="/controls"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white">
          <div className="container mx-auto px-6 py-16 lg:py-20">
            <div className="mx-auto max-w-5xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-soft bg-brand-softer px-3 py-1.5 text-caption font-bold text-brand">
                <BookOpen className="h-4 w-4" />
                Psychosocial Control Library
              </div>
              <h1 className="max-w-4xl text-section font-bold sm:text-display">
                A control is not finished when the action is completed.
              </h1>
              <p className="mt-5 max-w-3xl text-body leading-8 text-[#475569]">
                Use these guides to define what should change, what evidence to collect, where demand
                can migrate, when to review, and what workers should be asked before a control is
                considered effective.
              </p>
              <div className="mt-7">
                <Link
                  to="/did-the-control-work"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-brand px-5 py-3 text-caption font-bold text-white hover:bg-brand-hover"
                >
                  Check one of your controls <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-10">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-3 rounded-container border border-[#E2E8F0] bg-white p-4 shadow-sm md:grid-cols-[1fr_280px]">
              <label className="relative block">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search hazards, controls, or indicators"
                  className="w-full rounded-control border border-[#CBD5E1] py-3 pl-11 pr-4 text-caption text-[#0F172A]"
                />
              </label>
              <select
                value={hazard}
                onChange={(event) => setHazard(event.target.value)}
                className="w-full rounded-control border border-[#CBD5E1] bg-white px-4 py-3 text-caption text-[#0F172A]"
              >
                <option value="">All hazards</option>
                {HAZARDS.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-8 flex items-center justify-between gap-4">
              <p className="text-caption text-[#64748B]">
                {filtered.length} control guide{filtered.length === 1 ? '' : 's'}
              </p>
              <p className="hidden text-caption text-[#64748B] sm:block">
                Evidence framework, not legal advice.
              </p>
            </div>

            <div className="mt-4 grid gap-5 md:grid-cols-2">
              {filtered.map((entry) => (
                <Link
                  key={`${entry.hazardSlug}:${entry.controlSlug}`}
                  to={controlPath(entry)}
                  className="group rounded-container border border-[#E2E8F0] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-soft hover:shadow-md"
                >
                  <p className="text-caption font-bold uppercase tracking-wider text-brand">
                    {entry.hazard}
                  </p>
                  <h2 className="mt-2 text-subsection font-bold group-hover:text-brand">
                    {entry.control}
                  </h2>
                  <p className="mt-3 text-caption leading-6 text-[#475569]">{entry.intent}</p>

                  <div className="mt-5 rounded-control border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <p className="text-caption font-bold text-[#334155]">
                      What should change if it works?
                    </p>
                    <p className="mt-1 text-caption leading-6 text-[#64748B]">
                      {entry.expectedEffect}
                    </p>
                  </div>

                  <span className="mt-5 inline-flex items-center gap-2 text-caption font-bold text-brand">
                    Open the control review guide
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="mt-8 rounded-container border border-[#E2E8F0] bg-white p-8 text-center">
                <p className="font-bold">No matching control guide yet.</p>
                <p className="mt-2 text-caption text-[#64748B]">
                  Try a broader search. The library will expand as SignalTrue adds validated control
                  patterns.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
