import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell, { PageHeader } from '../../components/app/AppShell';
import { getAuthenticatedContext } from '../../utils/authContext';

const measurementClasses = [
  {
    title: 'Observed',
    status: 'Direct measurement',
    examples: 'Meeting counts, participant-hours, message counts, activity outside schedule',
    meaning:
      'Aggregates from connected account metadata. Accuracy depends on connector coverage, account matching, and team mapping.',
  },
  {
    title: 'Derived',
    status: 'Reproducible calculation',
    examples: 'Percent change, per-person averages, median/MAD deviation, network concentration',
    meaning:
      'Calculated from observed values. These describe a pattern; they do not establish why it happened.',
  },
  {
    title: 'Model index',
    status: 'Internal, not externally validated',
    examples: 'Work-pattern deviation, drift, capacity, fragmentation, and other 0-100 indices',
    meaning:
      'Transparent prioritization aids based on SignalTrue formulas and review bands. They are not probabilities, diagnoses, or industry norms.',
  },
  {
    title: 'AI interpretation',
    status: 'Hypothesis requiring review',
    examples: 'Possible explanations, discussion questions, and recommended experiments',
    meaning:
      'AI organizes measured evidence. It does not create a measurement, prove causation, or make an employment decision.',
  },
];

const sources = [
  ['Job Demands-Resources model', 'https://doi.org/10.1108/02683940710733115'],
  ['Original JD-R burnout model', 'https://pubmed.ncbi.nlm.nih.gov/11419809/'],
  ['Betweenness centrality', 'https://doi.org/10.2307/3033543'],
  [
    'NIST median absolute deviation',
    'https://www.itl.nist.gov/div898/software/dataplot/refman2/auxillar/mad.htm',
  ],
  ['NIST AI Risk Management Framework', 'https://www.nist.gov/itl/ai-risk-management-framework'],
  [
    'WHO burnout classification guidance',
    'https://www.who.int/standards/classifications/frequently-asked-questions/burn-out-an-occupational-phenomenon',
  ],
];

export default function Methodology() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    getAuthenticatedContext()
      .then((context) => setUser(context.user))
      .catch(() => setUser(null));
  }, []);

  return (
    <AppShell user={user} section="Methodology">
      <PageHeader
        eyebrow="Measurement model card"
        title="What each SignalTrue number means"
        description="A transparent boundary between observed metadata, derived statistics, internal models, and AI hypotheses."
      />

      <section className="app-panel border-l-4 border-l-amber-500">
        <p className="app-eyebrow">Validation status</p>
        <h2 className="mt-2 text-xl font-bold text-slate-900">
          SignalTrue's custom indices are descriptive models, not validated predictions
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          Research supports several underlying constructs and analytical methods. It does not
          validate SignalTrue's exact weights, 0-100 transformations, or review bands. Those values
          help prioritize a human review and must not be read as probabilities, diagnoses, causal
          findings, or individual performance scores.
        </p>
        <Link
          to="/app/validation"
          className="mt-4 inline-flex rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-bold text-amber-950 hover:border-amber-500"
        >
          View validation studies and evidence
        </Link>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {measurementClasses.map((item) => (
          <article key={item.title} className="app-panel">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-bold text-slate-900">{item.title}</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {item.status}
              </span>
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
              Examples
            </p>
            <p className="mt-1 text-sm text-slate-800">{item.examples}</p>
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
              How to use it
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-700">{item.meaning}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="app-panel">
          <p className="app-eyebrow">Appropriate use</p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">Review, test, and learn</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
            <li>Compare a privacy-eligible team with its own historical baseline.</li>
            <li>Open a conversation about context before assigning an explanation.</li>
            <li>Run a reversible operating experiment and measure the same direct metric again.</li>
            <li>Suppress conclusions when coverage or team size is insufficient.</li>
          </ul>
        </article>
        <article className="app-panel border-l-4 border-l-red-500">
          <p className="app-eyebrow">Not measured</p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">
            No individual or clinical claims
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
            <li>No individual attrition or flight-risk prediction.</li>
            <li>No burnout, mental-health, or engagement diagnosis.</li>
            <li>No employee ranking or automated employment decision.</li>
            <li>No claim that metadata correlation proves cause.</li>
          </ul>
        </article>
      </section>

      <section className="app-panel mt-6">
        <p className="app-eyebrow">Research foundations</p>
        <h2 className="mt-2 text-xl font-bold text-slate-900">Methods, not borrowed certainty</h2>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          These sources support constructs such as job demands/resources, robust baselines, and
          organizational network analysis. They do not validate SignalTrue's exact product formulas.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {sources.map(([label, href]) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-teal-800 hover:border-teal-400"
            >
              {label}
            </a>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
