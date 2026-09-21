/**
 * Per-route title, description and crawler summary.
 *
 * The app renders entirely on the client, so a crawler that does not run
 * JavaScript sees only the shell in public/index.html — the same title and
 * description on every URL, and none of the page's copy. The build step in
 * scripts/generate-route-html.js writes one HTML file per route from this
 * manifest, so the served response carries the right metadata before any
 * JavaScript executes.
 *
 * Plain JS with no imports so both the build script (Node) and the app
 * (bundler) can read it.
 */

const SITE_URL = 'https://www.signaltrue.ai';
const SOCIAL_IMAGE = `${SITE_URL}/social-preview-v2.png`;

/**
 * `summary` is rendered inside <noscript> for agents that do not execute
 * JavaScript. It restates what the page says rather than adding anything a
 * visitor cannot see, so the two never diverge.
 */
const ROUTE_META = {
  '/': {
    title: 'Psychosocial Risk & Control Assurance | SignalTrue',
    description:
      'Continuous, privacy-preserving work-condition evidence. Compare work before and after a control, check sustainability and identify possible workload migration without surveys or message content.',
    summary:
      'SignalTrue continuously measures team-level work patterns, compares conditions before and after a control, checks whether change was sustained, and flags possible migration. No message content, individual scoring, surveys or psychological diagnosis are required.',
  },
  '/product': {
    title: 'Continuous Work-Condition Evidence | SignalTrue',
    description:
      'Observe persistent changes in meetings, uninterrupted calendar availability, after-hours activity and coordination, then verify what changed after a control. No surveys required.',
    summary:
      'SignalTrue compares each team’s current work patterns with its own baseline and surfaces persistent changes that may warrant investigation. A signal is evidence that something in the way work is organised has changed — not a diagnosis.',
  },
  '/how-it-works': {
    title: 'How SignalTrue Continuously Measures Work Conditions',
    description:
      'Connect work-pattern metadata, establish each team’s baseline, observe persistent change and verify whether organisational controls changed the work. No message content or surveys required.',
    summary:
      'SignalTrue connects work-pattern metadata, learns each team’s normal rhythm, and looks for material and persistent change rather than reacting to a single busy week. Leaders investigate the cause alongside worker consultation, then review whether the pattern improved.',
  },
  '/solutions': {
    title: 'Work-Pattern Analytics for Health & Safety and Operations',
    description:
      'Work-pattern visibility for Health & Safety, operations, engineering and people leaders responsible for how work gets done.',
    summary:
      'Health & Safety teams add continuous work-pattern evidence between psychosocial risk assessments. Operations, engineering and people leaders use the same signals to see where workload and coordination pressure are building.',
  },
  '/trust': {
    title: 'Privacy-Preserving Team Work-Pattern Analytics | SignalTrue',
    description:
      'Metadata not content, team-level patterns, no individual productivity scoring and minimum group sizes. Work-pattern visibility without employee surveillance.',
    summary:
      'SignalTrue does not require message text, email bodies, documents or meeting recordings. Insights are team-level, with minimum group sizes, and there are no productivity ratings, leaderboards or employee rankings.',
  },
  '/sample-report': {
    title: 'Sample Work-Pattern Intelligence Report | SignalTrue',
    description:
      'See how a weekly work-pattern brief reports magnitude against baseline, how long a change has persisted, and what may be worth investigating.',
    summary:
      'A sample weekly brief showing meeting hours, uninterrupted calendar availability, after-hours activity and manager coordination load against the team’s established baseline, with how long each change has persisted and what may warrant investigation.',
  },
  '/psychosocial-risk-visibility-review': {
    title: 'What happens between psychosocial risk assessments? | SignalTrue',
    description:
      'See how SignalTrue helps WHS leaders identify changing team-level workload and coordination conditions between formal psychosocial risk assessments.',
    summary:
      'SignalTrue helps WHS leaders identify changing workload and coordination conditions between formal assessments using team-level, metadata-focused patterns. It does not diagnose individuals, and worker consultation and governance remain the employer’s responsibility.',
  },
  '/control-evidence-assessment': {
    title: 'Psychosocial Control Evidence Maturity Assessment | SignalTrue',
    description:
      'Assess how well your organisation detects change, investigates psychosocial risk, verifies controls and protects worker privacy. Get a 0-100 maturity score.',
    summary:
      'A 12-question diagnostic across detection, investigation, control verification and governance. Results describe process maturity and are not a legal compliance assessment or individual health assessment.',
  },
  '/norway/psychosocial-work-environment': {
    title: 'Psykososialt arbeidsmiljø og kontrollbevis | SignalTrue',
    description:
      'Se hvordan teamnivådata kan støtte systematisk arbeid med psykososialt arbeidsmiljø mellom kartlegginger, uten individuell overvåking.',
    summary:
      'SignalTrue supplerer norsk systematisk arbeidsmiljøarbeid med aggregert evidens om vedvarende endringer i arbeidsmønstre og før/etter-vurdering av organisatoriske tiltak.',
  },
  '/uk/work-related-stress': {
    title: 'Work-related stress risk and control evidence | SignalTrue',
    description:
      'Add team-level work-pattern evidence between stress risk assessments and verify whether organisational controls changed the work.',
    summary:
      'SignalTrue adds aggregated work-pattern evidence alongside worker consultation and HSE-style organisational stress risk management. It does not diagnose individuals or determine legal compliance.',
  },
  '/germany/psychische-belastung': {
    title: 'Psychische Belastung und Wirksamkeitskontrolle | SignalTrue',
    description:
      'Teambezogene Arbeitsmuster als ergänzende Evidenz für Gefährdungsbeurteilung, Maßnahmen und Wirksamkeitskontrolle.',
    summary:
      'SignalTrue unterstützt die Wirksamkeitskontrolle mit aggregierter Vorher/Nachher-Evidenz zu Arbeitsmustern. Die Plattform ersetzt keine Gefährdungsbeurteilung oder Rechtsberatung.',
  },
  '/netherlands/psychosociale-arbeidsbelasting': {
    title: 'Psychosociale arbeidsbelasting en RI&E-bewijs | SignalTrue',
    description:
      'Gebruik teamniveau werkpatronen als aanvullende evidence tussen RI&E-momenten en controleer of maatregelen het werk werkelijk veranderden.',
    summary:
      'SignalTrue voegt geaggregeerde werkpatroon-evidence toe tussen RI&E-momenten en helpt voor/na een maatregel te controleren of de werkwijze werkelijk veranderde.',
  },
  '/au': {
    title: 'Psychosocial Control Effectiveness Evidence Australia | SignalTrue',
    description:
      'Review whether a psychosocial control was followed by a meaningful change in team work patterns, with worker validation and explicit evidence limits.',
    summary:
      'For Australian WHS and psychosocial-risk teams reviewing controls: compare relevant team work patterns before and after a change, check for migration and validate the observation with workers before a decision.',
  },
  '/au/psychosocial-risk-monitoring': {
    title: 'Psychosocial Risk Monitoring Australia | SignalTrue',
    description:
      'Understand how continuous team-level work-pattern evidence supports investigation and control review between formal psychosocial risk assessments.',
    summary:
      'SignalTrue observes material and persistent changes in aggregated team work patterns. An observation supports investigation with workers and review of controls; it is not a hazard conclusion, diagnosis or compliance finding.',
  },
  '/au/8-week-pilot': {
    title: '8-Week Australian Psychosocial Control Pilot | SignalTrue',
    description:
      'A controlled eight-week pilot to establish team baselines, investigate work-pattern observations with workers and review evidence after a work-design control.',
    summary:
      'The Australian pilot confirms readiness, connects selected work systems, establishes a qualified baseline, investigates observations with workers, records a control and produces a final Psychosocial Control Evidence Pack.',
  },
  '/au/monitoring-gap-audit': {
    title: 'Psychosocial Control Review Readiness | SignalTrue Australia',
    description:
      'Six questions test whether your organisation can review one psychosocial control from implementation through evidence, worker validation and a decision.',
    summary:
      'Test whether your control-review process connects ownership, expected work change, before-and-after evidence, worker consultation and a maintain, modify or replace decision.',
  },
  '/au/standards-assurance': {
    title: 'ISO 45003 Alignment & Australian WHS | SignalTrue',
    description:
      'See how SignalTrue supports an ISO 45003-informed psychosocial risk process and Australian WHS control review, with responsibilities and product boundaries mapped explicitly.',
    summary:
      'An explicit mapping of the control-review workflow to ISO 45003-informed psychosocial risk management and the ISO 45001 OH&S context, including worker consultation, evidence boundaries and responsibilities.'
  },
  '/au/privacy': {
    title: 'Australian Privacy Overview | SignalTrue',
    description:
      'Review SignalTrue’s purpose limitation, work-pattern data boundary, field exclusions, aggregation and deployment-specific privacy configuration.',
    summary:
      'SignalTrue uses allowlisted work-pattern metadata for team-level evidence, excludes content and individual productivity ranking, and documents deployment-specific permissions, retention, roles and locations.',
  },
  '/au/worker-transparency': {
    title: 'Worker Transparency Australia | SignalTrue',
    description:
      'Plain-language guidance on why SignalTrue is used, which data is processed, who can see outputs, group protections and prohibited uses.',
    summary:
      'Workers should understand the purpose, scope, fields, exclusions, access, group protections, retention, locations, limitations and contact points before monitoring starts.',
  },
  '/au/security': {
    title: 'Security Overview Australia | SignalTrue',
    description:
      'Security controls for connector access, tenant data, aggregated work-pattern evidence and reports, with deployment-specific evidence available during procurement.',
    summary:
      'SignalTrue documents encryption, access control, least privilege, environment separation, monitoring, incident response, retention and deletion for the applicable deployment.',
  },
  '/au/data-residency': {
    title: 'Australian Data Residency Status | SignalTrue',
    description:
      'See what must be deployed and verified before SignalTrue makes an Australian data-residency claim for worker telemetry and derived evidence.',
    summary:
      'SignalTrue does not yet make a verified Australian data-residency guarantee. Storage, processing, logs, backups, support access, AI and subprocessors must be verified before the claim appears.',
  },
  '/au/trust': {
    title: 'Australian Trust Centre | SignalTrue',
    description:
      'Verify SignalTrue’s purpose, connector permissions, data boundary, group protections, access, retention, locations, AI boundaries and limitations.',
    summary:
      'The Australian Trust Centre brings together privacy, worker transparency, security, data location, AI governance and responsible-use limitations.',
  },
  '/au/ai-governance': {
    title: 'AI Governance Australia | SignalTrue',
    description:
      'How optional AI may support aggregate explanations while excluding person-level telemetry, employment decisions, diagnoses and automated legal conclusions.',
    summary:
      'Core SignalTrue metrics are deterministic. Optional AI is limited to aggregate evidence and human-reviewed support, and remains disabled for strict residency deployments unless in-region processing is verified.',
  },
  '/about': {
    title: 'About SignalTrue | Visibility Into the System of Work',
    description:
      'Many organisational problems are visible in working patterns before they are obvious in business outcomes. SignalTrue helps leaders see those changes earlier, without surveillance.',
    summary:
      'SignalTrue exists to make changes in the system of work visible — meeting structures, workload, uninterrupted calendar availability, management capacity and working hours — so leaders can investigate problems while they are still easier to address.',
  },
  '/pricing': {
    title: 'Pricing | SignalTrue Psychosocial Risk & Control Assurance',
    description:
      'Plans for Health & Safety, people and operational teams that need continuous visibility into workload and work-pattern change, and for leadership teams needing cross-team visibility.',
    summary:
      'Team Intelligence for Health & Safety, People and operational teams needing continuous visibility into work-pattern change. Leadership Intelligence for leadership teams needing cross-team visibility into workload and coordination pressure.',
  },
  '/contact': {
    title: 'Discuss a Pilot | SignalTrue',
    description:
      'Run a focused pilot to see whether continuous work-pattern evidence adds useful visibility alongside your existing psychosocial risk processes.',
    summary:
      'Contact SignalTrue to discuss a pilot with one team and see whether continuous work-pattern evidence adds useful visibility alongside existing psychosocial risk processes.',
  },
  '/resources': {
    title: 'Psychosocial Risk & Work Design Resources | SignalTrue',
    description:
      'Guidance on job demands, what happens between psychosocial risk assessments, reviewing whether an intervention worked, and work-pattern analytics without employee surveillance.',
    summary:
      'Articles on high job demands and digital work patterns, continuous visibility between psychosocial risk assessments, reviewing whether a workload intervention is working, and using operational data alongside worker consultation.',
  },
  '/privacy': {
    title: 'Privacy Policy | SignalTrue',
    description:
      'How SignalTrue handles website information and purpose-limited team work-pattern metadata, including fields, purposes, locations, retention and privacy contacts.',
    summary:
      'SignalTrue separates website information from customer-controlled product processing and documents the applicable purpose, allowlisted fields, exclusions, locations, service providers, retention and deletion.',
  },
  '/terms': {
    title: 'Responsible Use Terms | SignalTrue',
    description:
      'Public terms for responsible use of SignalTrue team-level work-pattern evidence, including prohibited individual monitoring and employment-decision uses.',
    summary:
      'SignalTrue supports team-level observation, worker-informed investigation and control review. It must not be used for individual productivity ranking, psychological profiling or automated employment decisions.',
  },

  // Signal pages and the older SEO landing pages. These carry most of the
  // organic search surface, and without an entry here every one of them serves
  // the same shell title — which is what search engines had indexed for several
  // of them.
  '/signals/meeting-overload': {
    title: 'Meeting Load Signal | SignalTrue',
    description:
      'See when meeting hours or recurring coordination demand rise persistently above a team’s normal pattern, and what may be worth investigating.',
    summary:
      'Meeting load shows whether meeting demand is increasing materially relative to the team’s normal pattern. High meeting load does not by itself mean a team has excessive job demands — it is a starting point for investigating delivery expectations, recurring meetings, dependencies and staffing.',
  },
  '/signals/recovery-time-collapse': {
    title: 'Recovery Time Signal | SignalTrue',
    description:
      'See when after-hours work and compressed recovery windows become a sustained, team-level pattern rather than an occasional peak.',
    summary:
      'Recovery time shows whether the gaps between demands are shrinking and whether pressure periods are extending. A sustained change may warrant investigation into workload, deadlines and staffing.',
  },
  '/signals/focus-fragmentation': {
    title: 'Focus Fragmentation Signal | SignalTrue',
    description:
      'See where interruptions and meeting patterns are progressively crowding out the uninterrupted time teams need for planned work.',
    summary:
      'Focus fragmentation shows whether uninterrupted working time is being crowded out by meetings and interruptions. A sustained decline provides useful context when investigating workload and work design.',
  },
  '/signals/after-hours-drift': {
    title: 'After-Hours Activity Signal | SignalTrue',
    description:
      'See whether work outside normal hours is occasional or becoming a persistent team-level pattern.',
    summary:
      'After-hours activity shows whether work is moving into evenings and weekends and whether that pattern persists. It may warrant investigation into workload, deadlines, staffing, time-zone expectations or recovery opportunities.',
  },
  '/signals/responsiveness-pressure': {
    title: 'Response Pressure Signal | SignalTrue',
    description:
      'See when response expectations are compressing and interrupt-driven work is displacing planned work.',
    summary:
      'Response pressure shows whether expected response intervals are shortening and urgent communication is rising, which can indicate that coordination requirements have changed.',
  },
  '/signals/coordination-overhead': {
    title: 'Coordination Overhead: Meaning, Signs & What to Change | SignalTrue',
    description:
      'Coordination overhead is time lost to handoffs, alignment loops and approvals. See how changing team work patterns can reveal rising coordination load.',
    summary:
      'Coordination overhead is the time and effort consumed by handoffs, alignment loops, approval paths and repeated coordination. SignalTrue shows whether these work patterns are changing against a team baseline so leaders can investigate the underlying process.',
  },
  '/signals/manager-load': {
    title: 'Manager Overload: Work-Pattern Signs & What to Review | SignalTrue',
    description:
      'See changing manager workload through meeting density, decision demand and uninterrupted calendar availability, without individual productivity scoring.',
    summary:
      'Manager coordination load shows team-level changes in manager meeting density, coordination demand and focus-time availability. Persistent increases may warrant investigation into management capacity, spans of control, decision processes or team dependencies.',
  },
  '/employee-engagement-leading-indicators': {
    title: 'Worker Consultation Indicators for Psychosocial Risk | SignalTrue',
    description:
      'Use work-pattern evidence to focus worker consultation on the teams where working conditions have measurably changed.',
    summary:
      'Work-pattern data cannot explain why a team is experiencing a change — workers can. SignalTrue helps identify where patterns have changed enough to warrant a closer conversation, and is used alongside worker consultation rather than instead of it.',
  },
  '/drift-diagnostic': {
    title: 'Work-Pattern Diagnostic | SignalTrue',
    description:
      'A short diagnostic to see which work-pattern changes are worth investigating in your organisation.',
    summary:
      'A short diagnostic covering meeting load, uninterrupted calendar availability, after-hours activity and manager coordination, to identify which work-pattern changes may be worth investigating.',
  },
  '/client-success': {
    title: 'How a SignalTrue Pilot Works | SignalTrue',
    description:
      'How a pilot runs: connect work-pattern metadata, establish baselines, review the first findings and check whether action changed the work.',
    summary:
      'How a SignalTrue pilot runs, from connecting work-pattern metadata and establishing team baselines through to reviewing findings and checking whether an intervention changed the observable work pattern.',
  },
  '/blog': {
    title: 'Work Design & Psychosocial Risk Articles | SignalTrue',
    description:
      'Articles on job demands, work design, meeting load, uninterrupted calendar availability, after-hours work and reviewing whether workload interventions are working.',
    summary:
      'Articles on job demands and work design, what happens between psychosocial risk assessments, and using operational evidence alongside worker consultation.',
  },
  '/blog/privacy-in-workforce-analysis-a-practical-guide-for-hr': {
    title: 'Privacy-First Workforce Analytics: Practical HR Guide | SignalTrue',
    headline: 'Privacy-first workforce analytics',
    description:
      'A practical guide to workforce analytics using purpose limitation, metadata boundaries, aggregation and no individual productivity scoring.',
    summary:
      'This guide explains how HR and people teams can use workforce analytics without turning it into employee surveillance. It covers data minimisation, purpose limitation, team-level aggregation, access controls and the boundary between work-pattern evidence and individual performance monitoring.',
    type: 'article',
    publishedAt: '2026-08-20T00:00:00.000Z',
    keywords: [
      'privacy first workforce analytics',
      'workforce analytics privacy',
      'HR analytics privacy',
      'employee analytics GDPR',
      'privacy preserving workforce analytics',
    ],
  },
  '/blog/getsignals-ai-alternatives-7': {
    title: 'GetSignals.ai Alternatives for Work-Pattern Analytics | SignalTrue',
    headline: 'GetSignals.ai alternatives for work-pattern analytics',
    description:
      'Compare approaches to workload visibility, work-pattern analytics, privacy and team-level early warning when evaluating GetSignals.ai alternatives.',
    summary:
      'A comparison guide for teams evaluating GetSignals.ai alternatives, with emphasis on team-level work-pattern evidence, workload visibility, privacy boundaries, aggregation and how different approaches support investigation without individual productivity scoring.',
    type: 'article',
    publishedAt: '2026-09-01T00:00:00.000Z',
    keywords: [
      'GetSignals.ai alternatives',
      'GetSignals alternatives',
      'work-pattern analytics',
      'workload analytics software',
      'privacy-first workforce analytics',
    ],
  },
  '/blog/unreasonable-workload-psychosocial-hazard-australia': {
    title: 'Unreasonable Workload: Psychosocial Hazard in Australia',
    headline: 'Unreasonable workload is a psychosocial hazard.',
    description:
      'Unreasonable workload can become a psychosocial hazard when it is frequent, prolonged or severe. Learn what Australian employers should monitor before complaints arrive.',
    lang: 'en-AU',
    summary:
      'Australian workplaces can miss unreasonable workload when it becomes culturally normal. This article explains high job demands, after-hours work, early exposure indicators and how to review whether a psychosocial control actually worked.',
    type: 'article',
    socialImage: `${SITE_URL}/images/blog/unreasonable-workload-australia/team-workload-discussion.jpg`,
    socialImageAlt:
      'Australian office team discussing workload and work design in a glass meeting room',
    publishedAt: '2026-08-30T05:30:00.000Z',
    keywords: [
      'unreasonable workload psychosocial hazard',
      'psychosocial hazards Australia',
      'high job demands',
      'workload risk assessment',
      'right to disconnect',
      'psychosocial risk monitoring',
      'after-hours work',
    ],
    faqs: [
      {
        question: 'Is unreasonable workload a psychosocial hazard in Australia?',
        answer:
          'Yes. High job demands, including having too much to do in too little time, can be a psychosocial hazard when exposure is severe, prolonged or frequent. The precise legal requirements depend on the relevant jurisdiction.',
      },
      {
        question: 'How should an employer assess workload risk?',
        answer:
          'Employers should consult workers, observe work, review available records and consider the duration, frequency and severity of exposure together with related hazards such as low job control and poor support.',
      },
      {
        question: 'Does the right to disconnect mean employers cannot contact staff after hours?',
        answer:
          'No. The right concerns an employee’s ability to refuse to monitor, read or respond outside working hours unless that refusal is unreasonable.',
      },
      {
        question: 'Can digital work data be used to monitor psychosocial risk?',
        answer:
          'Team-level digital work-pattern data can support risk identification and control review, but it should support consultation and human judgement rather than individual surveillance or automated diagnosis.',
      },
    ],
  },
};

const DEFAULT_META = ROUTE_META['/'];

function getRouteMeta(path) {
  if (!path) return DEFAULT_META;
  const normalized = path !== '/' ? path.replace(/\/+$/, '') : '/';
  return ROUTE_META[normalized] || DEFAULT_META;
}

module.exports = { ROUTE_META, DEFAULT_META, SITE_URL, SOCIAL_IMAGE, getRouteMeta };
