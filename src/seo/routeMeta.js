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
    title: 'Psychosocial Risk & Work-Pattern Early Warning | SignalTrue',
    description:
      'Continuous, team-level visibility into meeting load, focus time, after-hours work and manager coordination — without reading messages or monitoring individual productivity.',
    summary:
      'SignalTrue gives Health & Safety and operational leaders continuous, team-level visibility into changing work patterns: meeting load, focus time, after-hours activity and manager coordination. It uses work-pattern metadata, not message content, and does not score individual productivity.',
  },
  '/product': {
    title: 'Work-Pattern Signals for Psychosocial Risk | SignalTrue',
    description:
      'See persistent changes in how teams work across meetings, focus time, after-hours activity, manager capacity and collaboration. Team-level metadata, no message content.',
    summary:
      'SignalTrue compares each team’s current work patterns with its own baseline and surfaces persistent changes that may warrant investigation. A signal is evidence that something in the way work is organised has changed — not a diagnosis.',
  },
  '/how-it-works': {
    title: 'How SignalTrue Detects Persistent Work-Pattern Change',
    description:
      'Connect work-pattern metadata, establish each team’s baseline, detect persistent change, investigate with workers and review whether the work actually changed.',
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
      'A sample weekly brief showing meeting hours, focus time, after-hours activity and manager coordination load against the team’s established baseline, with how long each change has persisted and what may warrant investigation.',
  },
  '/australia-psychosocial-risk': {
    title: 'Psychosocial Risk Work-Pattern Monitoring Australia | SignalTrue',
    description:
      'Continuous team-level visibility into meeting load, focus time, after-hours work and manager capacity. Additional evidence for Australian psychosocial risk management without reading employee messages.',
    summary:
      'For Australian Health & Safety teams: continuous team-level visibility into digital work patterns between psychosocial risk assessments. SignalTrue does not determine that a psychosocial hazard exists and does not replace worker consultation or risk assessment.',
  },
  '/about': {
    title: 'About SignalTrue | Visibility Into the System of Work',
    description:
      'Many organisational problems are visible in working patterns before they are obvious in business outcomes. SignalTrue helps leaders see those changes earlier, without surveillance.',
    summary:
      'SignalTrue exists to make changes in the system of work visible — meeting structures, workload, focus time, management capacity and working hours — so leaders can investigate problems while they are still easier to address.',
  },
  '/pricing': {
    title: 'Pricing | SignalTrue Work-Pattern Early Warning',
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
    title: 'Privacy | SignalTrue',
    description:
      'How SignalTrue handles work-pattern metadata: no message content, team-level aggregation, minimum group sizes and no individual productivity scoring.',
    summary:
      'SignalTrue analyses work-pattern metadata at team level. No message content, no individual productivity scoring, no employee rankings.',
  },
  '/terms': {
    title: 'Terms | SignalTrue',
    description: 'Terms of service for SignalTrue work-pattern analytics.',
    summary: 'Terms of service for SignalTrue.',
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
    title: 'Coordination Load Signal | SignalTrue',
    description:
      'See when teams spend more of their time aligning work than moving decisions forward.',
    summary:
      'Coordination load shows whether handoffs, alignment loops and decision paths are growing. Persistent increases may warrant investigation into dependencies, decision processes and team structure.',
  },
  '/signals/manager-load': {
    title: 'Manager Coordination Load Signal | SignalTrue',
    description:
      'See where manager coordination patterns are changing — meeting density, decision demand and available focus time.',
    summary:
      'Manager coordination load shows team-level changes in manager meeting density, coordination demand and focus-time availability. Persistent increases may warrant investigation into management capacity, spans of control, decision processes or team dependencies.',
  },
  '/burnout-early-warning-system': {
    title: 'Psychosocial Risk Early Evidence for Teams | SignalTrue',
    description:
      'Review work conditions between surveys with continuous team-level evidence about meeting load, focus time, after-hours activity and manager coordination.',
    summary:
      'Continuous team-level evidence about working conditions between psychosocial risk assessments and surveys. SignalTrue shows observable work-pattern change; it does not diagnose burnout or determine that a psychosocial hazard exists.',
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
      'A short diagnostic covering meeting load, focus time, after-hours activity and manager coordination, to identify which work-pattern changes may be worth investigating.',
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
      'Articles on job demands, work design, meeting load, focus time, after-hours work and reviewing whether workload interventions are working.',
    summary:
      'Articles on job demands and work design, what happens between psychosocial risk assessments, and using operational evidence alongside worker consultation.',
  },
};

const DEFAULT_META = ROUTE_META['/'];

function getRouteMeta(path) {
  if (!path) return DEFAULT_META;
  const normalized = path !== '/' ? path.replace(/\/+$/, '') : '/';
  return ROUTE_META[normalized] || DEFAULT_META;
}

module.exports = { ROUTE_META, DEFAULT_META, SITE_URL, SOCIAL_IMAGE, getRouteMeta };
