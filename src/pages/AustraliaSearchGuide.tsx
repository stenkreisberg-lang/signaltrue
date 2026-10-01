import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ExternalLink } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageMeta from '../components/PageMeta';
import { Button } from '../components/ui/button';

type Guide = {
  title: string;
  description: string;
  eyebrow: string;
  intro: string;
  question: string;
  answer: string;
  sections: Array<{ title: string; paragraphs: string[]; bullets?: string[] }>;
  faqs: Array<{ question: string; answer: string }>;
};

const guides: Record<string, Guide> = {
  '/au/psychosocial-control-effectiveness': {
    title: 'Psychosocial Control Effectiveness Australia | SignalTrue',
    description:
      'How Australian WHS teams can review whether psychosocial controls changed the work, whether improvement held and whether risk moved elsewhere.',
    eyebrow: 'Australian WHS guide',
    intro:
      'A control is not effective because an action was completed. The practical question is whether the relevant work conditions changed, whether that change lasted and whether new risks appeared elsewhere.',
    question: 'How do you review psychosocial control effectiveness?',
    answer:
      'Use worker consultation and relevant workplace evidence to compare conditions before and after the control, then review whether the intended change occurred, was sustained and created any new or different risks. SignalTrue contributes team-level work-pattern evidence to that review. It does not make the legal decision.',
    sections: [
      {
        title: 'What Australian guidance requires',
        paragraphs: [
          'Safe Work Australia describes review of control measures as the final step of the risk-management process. Controls should be reviewed regularly and changed or replaced when they are not working effectively.',
          'The review should not rely on one metric. Consultation, workplace observation, records and data can all contribute. The question is whether controls work as planned without creating new risks.',
        ],
      },
      {
        title: 'A practical evidence loop',
        paragraphs: [
          'For digital and hybrid work, the useful unit is a defined control and a defined expected change in work. Measure the same relevant conditions before and after the intervention.',
        ],
        bullets: [
          'Define the control and the work condition it is intended to change.',
          'Establish a qualified baseline before the change.',
          'Consult workers and HSRs about the exposure and proposed control.',
          'Compare the same team-level indicators after implementation.',
          'Check whether improvement holds across later periods.',
          'Check whether workload or coordination pressure migrated elsewhere.',
          'Use the combined evidence to maintain, modify or replace the control.',
        ],
      },
      {
        title: 'Where SignalTrue fits',
        paragraphs: [
          'SignalTrue uses privacy-preserving work-pattern metadata to help Health & Safety teams see whether team-level conditions changed after a control. Examples include meeting demand, after-hours activity, uninterrupted calendar availability and coordination patterns.',
          'The output is evidence for investigation and review. It is not a diagnosis, an employee score, proof of causation or a statement that an organisation is legally compliant.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Does SignalTrue determine whether a psychosocial control is legally effective?',
        answer:
          'No. SignalTrue supplies work-pattern evidence that can support a control review. The organisation remains responsible for consultation, legal duties, context and the final decision.',
      },
      {
        question: 'Can a control review rely only on digital workplace data?',
        answer:
          'No. Australian guidance emphasises consultation with workers and HSRs. Digital work-pattern evidence can complement consultation and other records, not replace them.',
      },
      {
        question: 'What does control migration mean?',
        answer:
          'A control can improve one visible condition while demand moves into another channel, time period or team. A good review checks for that possibility before declaring success.',
      },
    ],
  },
  '/au/review-psychosocial-controls': {
    title: 'How to Review Psychosocial Controls in Australia | SignalTrue',
    description:
      'A practical Australian WHS review method for psychosocial controls using consultation, before-and-after evidence, sustainability and migration checks.',
    eyebrow: 'Control review method',
    intro:
      'The weak version of psychosocial risk management is action tracking: a meeting was removed, a policy was issued, a manager was trained. The stronger version asks what changed in the work after the action.',
    question: 'What should a psychosocial control review contain?',
    answer:
      'A useful review connects the original hazard and control to worker consultation, expected work changes, before-and-after evidence, unintended effects and a documented decision about whether to maintain, modify or replace the control.',
    sections: [
      {
        title: 'Start with the control, not the dashboard',
        paragraphs: [
          'The review should begin with a concrete organisational action. For example, reducing recurring meetings, changing staffing, protecting focus time, changing escalation rules or adjusting after-hours coverage.',
          'Before measuring anything, state what observable part of work should change if the control is doing what was intended.',
        ],
      },
      {
        title: 'Build a defensible review record',
        paragraphs: [
          'A useful evidence record makes the sequence visible. It should be possible for a WHS leader, HSR or executive to understand what the organisation saw, what it changed and what happened next.',
        ],
        bullets: [
          'Trigger or reason for review.',
          'Relevant psychosocial hazard and affected work group.',
          'Control owner and implementation date.',
          'Expected change in work.',
          'Baseline period and evidence source.',
          'Worker consultation and contextual findings.',
          'Post-control observation period.',
          'Sustainability and migration checks.',
          'Decision, owner and next review date.',
        ],
      },
      {
        title: 'Avoid the false certainty trap',
        paragraphs: [
          'A before-and-after pattern can strengthen or weaken a hypothesis, but it does not automatically prove causation. Other changes may have occurred at the same time.',
          'SignalTrue keeps observation separate from conclusion. A measured pattern should lead to investigation and consultation before it becomes part of a management decision.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How often should psychosocial controls be reviewed?',
        answer:
          'Australian guidance says controls should be reviewed regularly and when circumstances indicate a review is needed, including when a control may not be effective, workplace change creates new risk, consultation indicates a problem or an HSR requests review in relevant circumstances.',
      },
      {
        question: 'What evidence can be used in a psychosocial control review?',
        answer:
          'Worker consultation, workplace observation, reports, complaints, records and relevant data can all contribute. The right mix depends on the hazard, work and jurisdiction.',
      },
      {
        question: 'Can SignalTrue replace a psychosocial risk assessment?',
        answer:
          'No. SignalTrue is designed to add continuous work-pattern evidence between formal assessments and during control review.',
      },
    ],
  },
  '/au/continuous-psychosocial-risk-monitoring': {
    title: 'Continuous Psychosocial Risk Monitoring Australia | SignalTrue',
    description:
      'What continuous psychosocial risk monitoring can and cannot do in Australian workplaces, and how work-pattern evidence can complement consultation and formal assessment.',
    eyebrow: 'Continuous evidence',
    intro:
      'Psychosocial risk changes between annual surveys and formal assessments. Workload, coordination, staffing and after-hours patterns can shift in weeks. Continuous evidence is useful when it helps people notice change earlier without turning work into individual surveillance.',
    question: 'What is continuous psychosocial risk monitoring?',
    answer:
      'It is an ongoing process for observing changes in work conditions that may warrant investigation, while keeping worker consultation and human judgement central. SignalTrue focuses on aggregated team-level work patterns rather than diagnosing people.',
    sections: [
      {
        title: 'Monitoring is not diagnosis',
        paragraphs: [
          'A rise in after-hours activity or meeting load does not prove psychological harm. It tells a Health & Safety team that the way work is happening has changed and may deserve investigation.',
          'This distinction matters because psychosocial hazards depend on context, duration, frequency, severity and combinations of conditions. A software signal is one input, not the conclusion.',
        ],
      },
      {
        title: 'What can be observed without reading content',
        paragraphs: [
          'In digital work, metadata can provide evidence about how time and coordination are being used without reading message bodies or documents.',
        ],
        bullets: [
          'Meeting hours and back-to-back meeting density.',
          'Uninterrupted calendar availability.',
          'After-hours work-pattern activity.',
          'Coordination and interaction volume at team level.',
          'Persistent deviation from a team baseline.',
          'Whether a control-related improvement was sustained.',
        ],
      },
      {
        title: 'Use monitoring to improve the questions',
        paragraphs: [
          'The purpose is not to automate a WHS conclusion. It is to help WHS teams identify where to investigate, what to ask workers and whether a control appears to have changed the relevant work conditions.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Does continuous psychosocial monitoring replace worker consultation?',
        answer:
          'No. Consultation remains essential. Continuous work-pattern evidence can help target and inform consultation.',
      },
      {
        question: 'Does SignalTrue read emails or chat messages?',
        answer:
          'SignalTrue is designed around metadata and team-level patterns rather than message bodies, document content or individual productivity scoring.',
      },
      {
        question: 'Why monitor between formal assessments?',
        answer:
          'Because work conditions can change faster than periodic assessment cycles. Continuous evidence can help identify material and persistent change that deserves investigation.',
      },
    ],
  },
  '/au/psychosocial-risk-assessment-beyond-surveys': {
    title: 'Psychosocial Risk Assessment Beyond Surveys | Australia',
    description:
      'How Australian organisations can combine worker consultation and surveys with observation, records and continuous work-pattern evidence.',
    eyebrow: 'Assessment evidence',
    intro:
      'Surveys are useful because workers can report experiences that digital data cannot infer. Their limitation is timing. A survey is a measurement event. Work keeps changing after the survey closes.',
    question: 'Should psychosocial risk assessment rely only on surveys?',
    answer:
      'No. Surveys can be valuable, but Australian risk-management guidance also points to consultation, observation, reports, records and data. The strongest assessment process combines worker voice with evidence about how work is actually organised.',
    sections: [
      {
        title: 'Keep worker voice, add operational evidence',
        paragraphs: [
          'SignalTrue should not be positioned as an alternative to workers speaking about their experience. That would be both strategically weak and inconsistent with Australian consultation requirements.',
          'The stronger use case is to add another evidence layer. Worker voice explains context and experience. Work-pattern evidence helps show whether operating conditions are changing between assessment dates.',
        ],
      },
      {
        title: 'Use different evidence for different questions',
        paragraphs: [
          'A single method cannot answer every psychosocial-risk question. Match the evidence source to the decision you are making.',
        ],
        bullets: [
          'Use consultation to understand worker experience and context.',
          'Use surveys when structured worker-reported exposure data is needed.',
          'Use complaints and incident records to identify reported problems and lagging signals.',
          'Use observation and operational records to understand the work environment.',
          'Use continuous work-pattern evidence to identify persistent change and review controls over time.',
        ],
      },
      {
        title: 'The commercial gap SignalTrue addresses',
        paragraphs: [
          'Formal assessment can identify a risk and lead to an action. SignalTrue is strongest in the period after that action, when the organisation needs evidence about whether the work changed and whether the improvement lasted.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Is a psychosocial survey enough to manage risk?',
        answer:
          'A survey can be one important evidence source, but managing risk also requires control measures, consultation and review of whether controls remain effective.',
      },
      {
        question: 'Can work-pattern data show psychological harm?',
        answer:
          'No. Work-pattern data can show changes in how work is organised. It should not be used to diagnose individual psychological conditions.',
      },
      {
        question: 'Where does SignalTrue add value after an assessment?',
        answer:
          'It helps teams observe relevant work conditions between assessment cycles and compare evidence before and after organisational controls.',
      },
    ],
  },
};

const regulatorLinks = [
  {
    label: 'Safe Work Australia: Managing psychosocial hazards at work',
    href: 'https://www.safeworkaustralia.gov.au/doc/model-code-practice-managing-psychosocial-hazards-work',
  },
  {
    label: 'Safe Work Australia: Managing psychosocial risks at work',
    href: 'https://www.safeworkaustralia.gov.au/media-centre/news/managing-psychosocial-risks-work',
  },
];

export default function AustraliaSearchGuide() {
  const { pathname } = useLocation();
  const guide = guides[pathname] || guides['/au/psychosocial-control-effectiveness'];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <PageMeta
        title={guide.title}
        description={guide.description}
        path={pathname}
        lang="en-AU"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-24">
          <div className="container mx-auto max-w-5xl px-6">
            <p className="text-caption font-bold uppercase tracking-wider text-brand">{guide.eyebrow}</p>
            <h1 className="mt-4 max-w-4xl text-display font-bold leading-tight">{guide.question}</h1>
            <p className="mt-6 max-w-3xl text-body leading-8 text-[#475569]">{guide.intro}</p>
            <div className="mt-8 rounded-container border border-[#BFDBFE] bg-[#EFF6FF] p-6 md:p-8">
              <p className="text-caption font-bold uppercase tracking-wider text-brand">Short answer</p>
              <p className="mt-3 text-lead leading-8 text-[#0F172A]">{guide.answer}</p>
            </div>
          </div>
        </section>

        {guide.sections.map((section) => (
          <section key={section.title} className="border-b border-[#E2E8F0] py-14 lg:py-18">
            <div className="container mx-auto max-w-4xl px-6">
              <h2 className="text-section font-bold">{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-5 text-body leading-8 text-[#475569]">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-6 space-y-3">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3 text-body leading-7 text-[#475569]">
                      <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-brand" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}

        <section className="border-b border-[#E2E8F0] bg-white py-14 lg:py-18">
          <div className="container mx-auto max-w-4xl px-6">
            <h2 className="text-section font-bold">Frequently asked questions</h2>
            <div className="mt-8 space-y-5">
              {guide.faqs.map((faq) => (
                <article key={faq.question} className="rounded-container border border-[#E2E8F0] p-6">
                  <h3 className="text-lead font-bold">{faq.question}</h3>
                  <p className="mt-3 text-body leading-7 text-[#475569]">{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] py-14">
          <div className="container mx-auto max-w-4xl px-6">
            <h2 className="text-lead font-bold">Primary Australian sources</h2>
            <p className="mt-3 text-caption leading-6 text-[#64748B]">
              SignalTrue is not a regulator and this page is general information, not legal advice. Requirements vary by jurisdiction.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              {regulatorLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center font-semibold text-brand hover:underline"
                >
                  {link.label} <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="container mx-auto max-w-4xl px-6 text-center">
            <h2 className="text-section font-bold">Review one control, not another generic dashboard.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-body leading-7 text-[#475569]">
              Start with one organisational control you already changed and test whether your evidence process can show what happened next.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/au/monitoring-gap-audit">
                  Review one control <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/au">
                  SignalTrue Australia
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
